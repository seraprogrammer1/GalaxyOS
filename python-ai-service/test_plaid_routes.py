"""
Tests for all /api/plaid/* endpoints.

Strategy
--------
- Beanie is initialized once against a local `galaxyos_test` database so that
  the class-level query expressions (e.g. PlaidItem.owner == ...) resolve
  correctly.  No data is ever written; all DB calls are patched per-test.
- `require_admin` dependency is overridden to return a synthetic admin Session.
- The Plaid SDK client is patched via `plaid_client.get_plaid_client`.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from beanie import PydanticObjectId, init_beanie
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.testclient import TestClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# One-time Beanie initialisation so class-level expressions like
# `PlaidItem.owner == id` are valid (they require ExpressionField setup).
# ---------------------------------------------------------------------------

def _init_beanie_sync() -> None:
    from models.plaid_item import PlaidItem
    from models.session import Session
    from models.transaction import Transaction
    from models.account_snapshot import AccountSnapshot
    from models.investment_snapshot import InvestmentSnapshot
    from models.liability_snapshot import LiabilitySnapshot
    from models.recurring_snapshot import RecurringSnapshot

    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/galaxyos_test")
    # Force test DB so we never touch production data
    if "/galaxyos_test" not in uri:
        uri = uri.rstrip("/").rsplit("/", 1)[0] + "/galaxyos_test"

    async def _run():
        client = AsyncIOMotorClient(uri)
        await init_beanie(
            database=client["galaxyos_test"],
            document_models=[
                PlaidItem, Session, Transaction,
                AccountSnapshot, InvestmentSnapshot, LiabilitySnapshot, RecurringSnapshot,
            ],
        )

    asyncio.run(_run())


_init_beanie_sync()

# ---------------------------------------------------------------------------
# Import app AFTER Beanie is initialised (lifespan still patched so it won't
# try to re-initialise and open extra connections during TestClient startup).
# ---------------------------------------------------------------------------

with (
    patch("db.connect_db", new=AsyncMock()),
    patch("db.close_db", new=AsyncMock()),
    patch("sync_scheduler.start_scheduler", new=AsyncMock()),
    patch("sync_scheduler.stop_scheduler", new=AsyncMock()),
):
    from main import app

from auth import require_admin

# ---------------------------------------------------------------------------
# Shared test fixtures
# ---------------------------------------------------------------------------

FAKE_USER_ID = PydanticObjectId()
FAKE_ITEM_ID = "item-sandbox-abc123"
FAKE_ACCESS_TOKEN_ENC = "enc_token_xyz"

_future = datetime.now(timezone.utc) + timedelta(hours=8)

_fake_session = SimpleNamespace(
    token="test-session-token",
    user_id=FAKE_USER_ID,
    role="admin",
    ip_type="local",
    expires_at=_future,
)


def _override_auth():
    return _fake_session


app.dependency_overrides[require_admin] = _override_auth

client = TestClient(app, raise_server_exceptions=False)


def _make_item(item_id: str = FAKE_ITEM_ID) -> MagicMock:
    """Return a mock PlaidItem document."""
    item = MagicMock()
    item.item_id = item_id
    item.institution_name = "Test Bank"
    item.institution_id = "ins_001"
    item.access_token = FAKE_ACCESS_TOKEN_ENC
    item.owner = FAKE_USER_ID
    item.products = ["transactions"]
    item.id = PydanticObjectId()
    item.cursor = None
    item.save = AsyncMock()
    item.insert = AsyncMock()
    item.delete = AsyncMock()
    return item


def _make_snap(item_id: str = FAKE_ITEM_ID, hours_old: float = 0.5) -> MagicMock:
    """Return a fresh (non-stale) AccountSnapshot mock."""
    snap = MagicMock()
    snap.item_id = item_id
    snap.owner = FAKE_USER_ID
    snap.last_synced_at = datetime.now(timezone.utc) - timedelta(hours=hours_old)
    snap.accounts = [
        {
            "account_id": "acct-001",
            "name": "Checking",
            "type": "depository",
            "subtype": "checking",
            "balances": {"available": 1500.0, "current": 1500.0, "limit": None},
        }
    ]
    snap.save = AsyncMock()
    snap.insert = AsyncMock()
    snap.replace = AsyncMock()
    return snap


def _make_motor_collection() -> MagicMock:
    """Return a mock Motor collection whose delete_many is awaitable."""
    col = MagicMock()
    col.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
    col.bulk_write = AsyncMock()
    return col


def _plaid_response(**kwargs: Any) -> MagicMock:
    """Build a dict-like Plaid response mock."""
    m = MagicMock()
    m.__getitem__ = lambda self, k: kwargs[k]
    m.get = lambda k, default=None: kwargs.get(k, default)
    return m


# ===========================================================================
# Tests
# ===========================================================================


class TestHealth:
    def test_health_ok(self):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json().get("status") == "AI Core Online"


# ---------------------------------------------------------------------------
# POST /api/plaid/create-link-token
# ---------------------------------------------------------------------------

class TestCreateLinkToken:
    def test_success(self):
        plaid_mock = MagicMock()
        plaid_mock.link_token_create.return_value = _plaid_response(
            link_token="link-sandbox-abc"
        )
        with patch("routes.plaid.get_plaid_client", return_value=plaid_mock):
            res = client.post("/api/plaid/create-link-token", json={})
        assert res.status_code == 200
        assert res.json()["link_token"] == "link-sandbox-abc"

    def test_custom_products(self):
        plaid_mock = MagicMock()
        plaid_mock.link_token_create.return_value = _plaid_response(
            link_token="link-sandbox-xyz"
        )
        with patch("routes.plaid.get_plaid_client", return_value=plaid_mock):
            res = client.post(
                "/api/plaid/create-link-token",
                json={"products": ["investments", "liabilities"]},
            )
        assert res.status_code == 200
        assert "link_token" in res.json()

    def test_plaid_error_returns_502(self):
        import plaid as plaid_lib

        exc = plaid_lib.ApiException(status=400)
        exc.body = {"error_message": "bad request"}
        plaid_mock = MagicMock()
        plaid_mock.link_token_create.side_effect = exc
        with patch("routes.plaid.get_plaid_client", return_value=plaid_mock):
            res = client.post("/api/plaid/create-link-token", json={})
        assert res.status_code == 502


# ---------------------------------------------------------------------------
# POST /api/plaid/exchange-token
# ---------------------------------------------------------------------------

class TestExchangeToken:
    def test_new_item(self):
        plaid_mock = MagicMock()
        plaid_mock.item_public_token_exchange.return_value = _plaid_response(
            access_token="access-sandbox-new",
            item_id=FAKE_ITEM_ID,
        )
        fake_item = _make_item()

        with (
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=None)),
            patch("routes.plaid.PlaidItem.insert", new=AsyncMock()),
            patch("routes.plaid.encrypt_token", return_value=FAKE_ACCESS_TOKEN_ENC),
            patch("routes.plaid._full_sync", new=AsyncMock()),
            patch("asyncio.create_task"),
        ):
            # patch __init__ to avoid real Beanie insert
            with patch("routes.plaid.PlaidItem", return_value=fake_item) as MockItem:
                MockItem.find_one = AsyncMock(return_value=None)
                fake_item.insert = AsyncMock()
                res = client.post(
                    "/api/plaid/exchange-token",
                    json={
                        "public_token": "public-sandbox-abc",
                        "institution_name": "Test Bank",
                        "institution_id": "ins_001",
                    },
                )
        assert res.status_code == 200
        assert res.json().get("status") in ("success", "updated")

    def test_plaid_error_returns_502(self):
        import plaid as plaid_lib

        exc = plaid_lib.ApiException(status=400)
        exc.body = {"error_message": "invalid token"}
        plaid_mock = MagicMock()
        plaid_mock.item_public_token_exchange.side_effect = exc
        with patch("routes.plaid.get_plaid_client", return_value=plaid_mock):
            res = client.post(
                "/api/plaid/exchange-token",
                json={
                    "public_token": "bad-token",
                    "institution_name": "Test Bank",
                },
            )
        assert res.status_code == 502


# ---------------------------------------------------------------------------
# GET /api/plaid/items
# ---------------------------------------------------------------------------

class TestListItems:
    def test_returns_item_list(self):
        fake_item = _make_item()
        mock_find = MagicMock()
        mock_find.to_list = AsyncMock(return_value=[fake_item])

        with patch("routes.plaid.PlaidItem.find", return_value=mock_find):
            res = client.get("/api/plaid/items")

        assert res.status_code == 200
        items = res.json()["items"]
        assert len(items) == 1
        assert items[0]["item_id"] == FAKE_ITEM_ID
        assert "access_token" not in items[0]  # must NOT leak token

    def test_empty_when_no_items(self):
        mock_find = MagicMock()
        mock_find.to_list = AsyncMock(return_value=[])

        with patch("routes.plaid.PlaidItem.find", return_value=mock_find):
            res = client.get("/api/plaid/items")

        assert res.status_code == 200
        assert res.json()["items"] == []


# ---------------------------------------------------------------------------
# DELETE /api/plaid/items/{item_id}
# ---------------------------------------------------------------------------

class TestRemoveItem:
    def test_removes_successfully(self):
        fake_item = _make_item()
        col_mock = _make_motor_collection()
        plaid_mock = MagicMock()

        with (
            patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=fake_item)),
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.decrypt_token", return_value="access-sandbox"),
            patch("routes.plaid.Transaction.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.AccountSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.InvestmentSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.LiabilitySnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.RecurringSnapshot.get_motor_collection", return_value=col_mock),
        ):
            res = client.delete(f"/api/plaid/items/{FAKE_ITEM_ID}")

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "removed"
        assert data["item_id"] == FAKE_ITEM_ID

    def test_404_when_item_not_found(self):
        with patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=None)):
            res = client.delete("/api/plaid/items/does-not-exist")
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/plaid/accounts
# ---------------------------------------------------------------------------

class TestGetAccounts:
    def test_returns_from_snapshot(self):
        fake_item = _make_item()
        snap = _make_snap()

        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.AccountSnapshot.find_one", new=AsyncMock(return_value=snap)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/accounts")

        assert res.status_code == 200
        body = res.json()
        assert "accounts" in body
        assert len(body["accounts"]) == 1
        assert body["stale"] is False

    def test_stale_when_no_snapshot(self):
        fake_item = _make_item()
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.AccountSnapshot.find_one", new=AsyncMock(return_value=None)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/accounts")

        assert res.status_code == 200
        assert res.json()["stale"] is True
        assert res.json()["accounts"] == []


# ---------------------------------------------------------------------------
# GET /api/plaid/net-worth
# ---------------------------------------------------------------------------

class TestGetNetWorth:
    def test_calculates_net_worth_from_snapshot(self):
        fake_item = _make_item()
        snap = _make_snap()
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.AccountSnapshot.find_one", new=AsyncMock(return_value=snap)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/net-worth")

        assert res.status_code == 200
        body = res.json()
        assert "net_worth" in body or "total_assets" in body or "institutions" in body

    def test_empty_when_no_items(self):
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[])

        with patch("routes.plaid.PlaidItem.find", return_value=find_mock):
            res = client.get("/api/plaid/net-worth")

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# GET /api/plaid/transactions
# ---------------------------------------------------------------------------

class TestGetTransactions:
    def _make_tx(self) -> MagicMock:
        tx = MagicMock()
        tx.transaction_id = "tx-001"
        tx.item_id = FAKE_ITEM_ID
        tx.owner = FAKE_USER_ID
        tx.amount = 42.0
        tx.name = "Coffee"
        tx.date = "2026-04-01"
        tx.pending = False
        tx.category = ["Food"]
        tx.category_primary = "FOOD_AND_DRINK"
        tx.merchant_name = "Starbucks"
        tx.logo_url = None
        tx.model_dump = MagicMock(
            return_value={
                "transaction_id": "tx-001",
                "amount": 42.0,
                "name": "Coffee",
                "date": "2026-04-01",
            }
        )
        return tx

    def test_returns_transactions(self):
        tx = self._make_tx()

        # Shared mock that handles count(), sort/skip/limit chain, and find()
        find_mock = MagicMock()
        find_mock.count = AsyncMock(return_value=1)  # non-zero → skip auto-sync
        find_mock.find = MagicMock(return_value=find_mock)  # category filter
        find_mock.sort = MagicMock(return_value=find_mock)
        find_mock.skip = MagicMock(return_value=find_mock)
        find_mock.limit = MagicMock(return_value=find_mock)
        find_mock.to_list = AsyncMock(return_value=[tx])

        with patch("routes.plaid.Transaction.find", return_value=find_mock):
            res = client.get("/api/plaid/transactions")

        assert res.status_code == 200
        body = res.json()
        assert "added" in body
        assert body["total"] == 1


# ---------------------------------------------------------------------------
# GET /api/plaid/budget
# ---------------------------------------------------------------------------

class TestGetBudget:
    def _make_income_tx(self) -> MagicMock:
        tx = MagicMock()
        tx.amount = -2000.0  # negative = income in Plaid
        tx.category_primary = "INCOME"
        tx.date = "2026-04-01"
        return tx

    def _make_expense_tx(self) -> MagicMock:
        tx = MagicMock()
        tx.amount = 50.0
        tx.category_primary = "FOOD_AND_DRINK"
        tx.date = "2026-04-10"
        return tx

    def test_returns_budget_summary(self):
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(
            return_value=[self._make_income_tx(), self._make_expense_tx()]
        )

        with patch("routes.plaid.Transaction.find", return_value=find_mock):
            res = client.get("/api/plaid/budget")

        assert res.status_code == 200
        body = res.json()
        assert "spent" in body or "remaining" in body or "total" in body


# ---------------------------------------------------------------------------
# GET /api/plaid/money-flow
# ---------------------------------------------------------------------------

class TestGetMoneyFlow:
    def test_returns_money_flow(self):
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[])

        with patch("routes.plaid.Transaction.find", return_value=find_mock):
            res = client.get("/api/plaid/money-flow")

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# GET /api/plaid/recurring
# ---------------------------------------------------------------------------

class TestGetRecurring:
    def test_returns_from_snapshot(self):
        fake_item = _make_item()
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        rec_snap = MagicMock()
        rec_snap.item_id = FAKE_ITEM_ID
        rec_snap.owner = FAKE_USER_ID
        rec_snap.last_synced_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        rec_snap.inflow_streams = []
        rec_snap.outflow_streams = [{"stream_id": "s1", "name": "Netflix", "amount": 15.0}]

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.RecurringSnapshot.find_one", new=AsyncMock(return_value=rec_snap)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/recurring")

        assert res.status_code == 200
        body = res.json()
        assert "outflow_streams" in body or "inflow_streams" in body

    def test_stale_when_no_snapshot(self):
        fake_item = _make_item()
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.RecurringSnapshot.find_one", new=AsyncMock(return_value=None)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/recurring")

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# GET /api/plaid/investments
# ---------------------------------------------------------------------------

class TestGetInvestments:
    def test_returns_from_snapshot(self):
        fake_item = _make_item()
        fake_item.products = ["investments"]
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        inv_snap = MagicMock()
        inv_snap.item_id = FAKE_ITEM_ID
        inv_snap.owner = FAKE_USER_ID
        inv_snap.last_synced_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        inv_snap.holdings = [{"security_id": "sec-001", "quantity": 10, "institution_value": 500.0}]
        inv_snap.total_value = 500.0

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.InvestmentSnapshot.find_one", new=AsyncMock(return_value=inv_snap)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/investments")

        assert res.status_code == 200
        body = res.json()
        assert "holdings" in body or "total_value" in body

    def test_no_investment_items(self):
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[])

        with patch("routes.plaid.PlaidItem.find", return_value=find_mock):
            res = client.get("/api/plaid/investments")

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# GET /api/plaid/liabilities
# ---------------------------------------------------------------------------

class TestGetLiabilities:
    def test_returns_from_snapshot(self):
        fake_item = _make_item()
        fake_item.products = ["liabilities"]
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        liab_snap = MagicMock()
        liab_snap.item_id = FAKE_ITEM_ID
        liab_snap.owner = FAKE_USER_ID
        liab_snap.last_synced_at = datetime.now(timezone.utc) - timedelta(hours=1)
        liab_snap.credit_cards = [{"account_id": "cc-001", "last_statement_balance": 350.0}]
        liab_snap.student_loans = []
        liab_snap.mortgages = []
        liab_snap.total_debt = 350.0

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.LiabilitySnapshot.find_one", new=AsyncMock(return_value=liab_snap)),
            patch("asyncio.create_task"),
        ):
            res = client.get("/api/plaid/liabilities")

        assert res.status_code == 200
        body = res.json()
        assert "credit_cards" in body or "total_debt" in body

    def test_no_liability_items(self):
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[])

        with patch("routes.plaid.PlaidItem.find", return_value=find_mock):
            res = client.get("/api/plaid/liabilities")

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/plaid/transactions/refresh
# ---------------------------------------------------------------------------

class TestTransactionsRefresh:
    def test_triggers_refresh_for_all_items(self):
        fake_item = _make_item()
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])

        plaid_mock = MagicMock()
        plaid_mock.transactions_refresh.return_value = MagicMock()

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.decrypt_token", return_value="access-sandbox"),
        ):
            res = client.post("/api/plaid/transactions/refresh")

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# DELETE /api/plaid/clear
# ---------------------------------------------------------------------------

class TestClearAllData:
    def test_clears_all_user_data(self):
        fake_item = _make_item()
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[fake_item])
        col_mock = _make_motor_collection()
        plaid_mock = MagicMock()

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.decrypt_token", return_value="access-sandbox"),
            patch("routes.plaid.Transaction.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.AccountSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.InvestmentSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.LiabilitySnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.RecurringSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.PlaidItem.get_motor_collection", return_value=col_mock),
        ):
            res = client.delete("/api/plaid/clear")

        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "cleared"
        assert body["items_removed"] == 1

    def test_clears_when_no_items(self):
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[])
        col_mock = _make_motor_collection()
        plaid_mock = MagicMock()

        with (
            patch("routes.plaid.PlaidItem.find", return_value=find_mock),
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.Transaction.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.AccountSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.InvestmentSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.LiabilitySnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.RecurringSnapshot.get_motor_collection", return_value=col_mock),
            patch("routes.plaid.PlaidItem.get_motor_collection", return_value=col_mock),
        ):
            res = client.delete("/api/plaid/clear")

        assert res.status_code == 200
        assert res.json()["items_removed"] == 0


# ---------------------------------------------------------------------------
# POST /api/plaid/webhook  (unauthenticated — no AdminSession)
# ---------------------------------------------------------------------------

class TestWebhook:
    def test_unrecognised_webhook_type_is_ignored(self):
        # Temporarily remove auth override since webhook has no session dependency
        # (it uses Request directly)
        payload = {
            "webhook_type": "AUTH",
            "webhook_code": "SOMETHING",
            "item_id": FAKE_ITEM_ID,
        }
        find_mock = MagicMock()
        find_mock.to_list = AsyncMock(return_value=[])

        with (
            patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=None)),
            patch("routes.plaid._verify_plaid_webhook", new=AsyncMock(return_value=True)),
        ):
            res = client.post(
                "/api/plaid/webhook",
                json=payload,
                headers={"Plaid-Verification": "fake.jwt.token"},
            )

        # Should not crash; 200 or 400 depending on item lookup
        assert res.status_code in (200, 400, 404)

    def test_transactions_sync_webhook(self):
        fake_item = _make_item()
        col_mock = _make_motor_collection()
        plaid_mock = MagicMock()
        plaid_mock.transactions_sync.return_value = _plaid_response(
            added=[],
            modified=[],
            removed=[],
            next_cursor="cursor-abc",
            has_more=False,
        )

        with (
            patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=fake_item)),
            patch("routes.plaid._verify_plaid_webhook", new=AsyncMock(return_value=True)),
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.decrypt_token", return_value="access-sandbox"),
            patch("routes.plaid.Transaction.get_motor_collection", return_value=col_mock),
        ):
            res = client.post(
                "/api/plaid/webhook",
                json={
                    "webhook_type": "TRANSACTIONS",
                    "webhook_code": "SYNC_UPDATES_AVAILABLE",
                    "item_id": FAKE_ITEM_ID,
                },
                headers={"Plaid-Verification": "fake.jwt.token"},
            )

        assert res.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/plaid/sandbox/fire-webhook  (sandbox only)
# ---------------------------------------------------------------------------

class TestFireWebhook:
    def test_fires_webhook(self):
        fake_item = _make_item()
        plaid_mock = MagicMock()
        plaid_mock.sandbox_item_fire_webhook.return_value = MagicMock()

        with (
            patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=fake_item)),
            patch("routes.plaid.get_plaid_client", return_value=plaid_mock),
            patch("routes.plaid.decrypt_token", return_value="access-sandbox"),
        ):
            res = client.post(
                "/api/plaid/sandbox/fire-webhook",
                json={"item_id": FAKE_ITEM_ID},
            )

        assert res.status_code == 200

    def test_404_when_item_not_found(self):
        with patch("routes.plaid.PlaidItem.find_one", new=AsyncMock(return_value=None)):
            res = client.post(
                "/api/plaid/sandbox/fire-webhook",
                json={"item_id": "nonexistent"},
            )
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Auth guard — all protected routes must return 401 without a session token
# ---------------------------------------------------------------------------

class TestAuthGuard:
    """Remove the dependency override temporarily to verify 401 enforcement."""

    def setup_method(self):
        app.dependency_overrides.pop(require_admin, None)

    def teardown_method(self):
        app.dependency_overrides[require_admin] = _override_auth

    def test_items_requires_auth(self):
        res = client.get("/api/plaid/items")
        assert res.status_code == 401

    def test_accounts_requires_auth(self):
        res = client.get("/api/plaid/accounts")
        assert res.status_code == 401

    def test_transactions_requires_auth(self):
        res = client.get("/api/plaid/transactions")
        assert res.status_code == 401

    def test_clear_requires_auth(self):
        res = client.delete("/api/plaid/clear")
        assert res.status_code == 401
