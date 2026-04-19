from __future__ import annotations

import asyncio
import calendar
import hashlib
import logging
from datetime import datetime, timezone
from typing import Annotated, Any

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pymongo import ReplaceOne
from pydantic import BaseModel

from auth import Session, require_admin
from encryption import decrypt_token, encrypt_token
from models.plaid_item import PlaidItem
from models.transaction import Transaction
from models.account_snapshot import AccountSnapshot
from models.investment_snapshot import InvestmentSnapshot
from models.liability_snapshot import LiabilitySnapshot
from models.recurring_snapshot import RecurringSnapshot
from plaid_client import get_plaid_client

import os

import plaid
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_recurring_get_request import TransactionsRecurringGetRequest
from plaid.model.transactions_refresh_request import TransactionsRefreshRequest
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.liabilities_get_request import LiabilitiesGetRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.sandbox_item_fire_webhook_request import SandboxItemFireWebhookRequest
from plaid.model.webhook_verification_key_get_request import WebhookVerificationKeyGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

router = APIRouter(prefix="/api/plaid", tags=["plaid"])

AdminSession = Annotated[Session, Depends(require_admin)]

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ExchangeTokenRequest(BaseModel):
    public_token: str
    institution_name: str = "Unknown Institution"
    institution_id: str = ""
    products: list[str] = []   # products that were requested during Link


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _plaid_error(exc: Exception) -> JSONResponse:
    if isinstance(exc, plaid.ApiException):
        try:
            body = exc.body if isinstance(exc.body, dict) else {}
            detail = body.get("error_message", str(exc))
        except Exception:
            detail = str(exc)
        return JSONResponse(status_code=502, content={"error": detail})
    return JSONResponse(status_code=502, content={"error": str(exc)})


log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Staleness helpers — serve from MongoDB first, background-sync when stale
# ---------------------------------------------------------------------------

# Stale thresholds in hours (configurable via env vars)
_BALANCE_STALE_HOURS = float(os.getenv("BALANCE_STALE_HOURS", "4"))
_INVESTMENT_STALE_HOURS = float(os.getenv("INVESTMENT_STALE_HOURS", "6"))
_LIABILITY_STALE_HOURS = float(os.getenv("LIABILITY_STALE_HOURS", "24"))
_RECURRING_STALE_HOURS = float(os.getenv("RECURRING_STALE_HOURS", "24"))

# Simple in-process cache for Plaid webhook verification public keys (kid → JWK dict)
_webhook_key_cache: dict[str, dict] = {}


def _is_stale(last_synced_at: datetime | None, threshold_hours: float) -> bool:
    """Return True when the snapshot is missing or older than threshold_hours."""
    if last_synced_at is None:
        return True
    age_hours = (datetime.now(timezone.utc) - last_synced_at).total_seconds() / 3600
    return age_hours >= threshold_hours


def _current_month_range() -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    first_ts = int(datetime(now.year, now.month, 1, tzinfo=timezone.utc).timestamp())
    last_day = calendar.monthrange(now.year, now.month)[1]
    last_ts = int(datetime(now.year, now.month, last_day, 23, 59, 59, tzinfo=timezone.utc).timestamp())
    return first_ts, last_ts


# ---------------------------------------------------------------------------
# POST /api/plaid/create-link-token
# ---------------------------------------------------------------------------

class CreateLinkTokenRequest(BaseModel):
    products: list[str] = ["transactions"]
    webhook_url: str = ""


@router.post("/create-link-token")
async def create_link_token(session: AdminSession, body: CreateLinkTokenRequest = CreateLinkTokenRequest()) -> dict:
    client = get_plaid_client()
    # Validate requested products against known valid ones
    _valid_products = {"transactions", "investments", "liabilities"}
    requested = [p for p in body.products if p in _valid_products]
    if not requested:
        requested = ["transactions"]

    # Use env webhook URL if the caller didn't supply one
    webhook = body.webhook_url or os.getenv("PLAID_WEBHOOK_URL", "")

    try:
        kwargs: dict = dict(
            products=[Products(p) for p in requested],
            client_name="GalaxyOS",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(
                client_user_id=str(session.user_id or "admin")
            ),
        )
        if webhook:
            kwargs["webhook"] = webhook
        request = LinkTokenCreateRequest(**kwargs)
        response = client.link_token_create(request)
        return {"link_token": response["link_token"]}
    except Exception as exc:
        return _plaid_error(exc)


# ---------------------------------------------------------------------------
# POST /api/plaid/exchange-token
# ---------------------------------------------------------------------------

@router.post("/exchange-token")
async def exchange_token(body: ExchangeTokenRequest, session: AdminSession) -> dict:
    client = get_plaid_client()
    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=body.public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
    except Exception as exc:
        return _plaid_error(exc)

    raw_access_token: str = exchange_response["access_token"]
    item_id: str = exchange_response["item_id"]

    # Check if this item is already linked (re-link scenario)
    existing = await PlaidItem.find_one(PlaidItem.item_id == item_id)
    if existing:
        existing.access_token = encrypt_token(raw_access_token)
        existing.institution_name = body.institution_name
        existing.institution_id = body.institution_id
        if body.products:
            existing.products = body.products
        await existing.save()
        asyncio.create_task(_full_sync(existing))
        return {"status": "updated", "item_id": item_id}

    item = PlaidItem(
        owner=PydanticObjectId(str(session.user_id)),
        access_token=encrypt_token(raw_access_token),
        item_id=item_id,
        institution_name=body.institution_name,
        institution_id=body.institution_id,
        products=body.products,
    )
    await item.insert()
    # Kick off a background sync immediately so data is ready when the user navigates
    asyncio.create_task(_full_sync(item))
    return {"status": "success", "item_id": item_id}


# ---------------------------------------------------------------------------
# GET /api/plaid/items  — list linked institutions (no access_token)
# ---------------------------------------------------------------------------

@router.get("/items")
async def list_items(session: AdminSession) -> dict:
    items = await PlaidItem.find(
        PlaidItem.owner == PydanticObjectId(str(session.user_id))
    ).to_list()
    return {
        "items": [
            {
                "item_id": it.item_id,
                "institution_name": it.institution_name,
                "institution_id": it.institution_id,
                "id": str(it.id),
            }
            for it in items
        ]
    }


# ---------------------------------------------------------------------------
# DELETE /api/plaid/items/{item_id}
# ---------------------------------------------------------------------------

@router.delete("/items/{item_id}")
async def remove_item(item_id: str, session: AdminSession) -> dict:
    item = await PlaidItem.find_one(
        PlaidItem.item_id == item_id,
        PlaidItem.owner == PydanticObjectId(str(session.user_id)),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    client = get_plaid_client()
    try:
        raw_token = decrypt_token(item.access_token)
        client.item_remove(ItemRemoveRequest(access_token=raw_token))
    except Exception:
        # Plaid removal failed (e.g. already removed) — still delete locally
        pass

    await item.delete()
    # Remove all stored data for this item so no stale data remains
    await Transaction.get_motor_collection().delete_many({"item_id": item_id})
    await AccountSnapshot.get_motor_collection().delete_many({"item_id": item_id})
    await InvestmentSnapshot.get_motor_collection().delete_many({"item_id": item_id})
    await LiabilitySnapshot.get_motor_collection().delete_many({"item_id": item_id})
    await RecurringSnapshot.get_motor_collection().delete_many({"item_id": item_id})
    return {"status": "removed", "item_id": item_id}


# ---------------------------------------------------------------------------
# GET /api/plaid/accounts
# ---------------------------------------------------------------------------

@router.get("/accounts")
async def get_accounts(session: AdminSession) -> dict:
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()

    all_accounts: list[dict] = []
    stale = False
    oldest_sync: datetime | None = None

    for item in items:
        snap = await AccountSnapshot.find_one(AccountSnapshot.item_id == item.item_id)
        if snap is None or _is_stale(snap.last_synced_at, _BALANCE_STALE_HOURS):
            stale = True
            asyncio.create_task(_sync_balances(item))
        if snap is not None:
            all_accounts.extend(snap.accounts)
            if oldest_sync is None or snap.last_synced_at < oldest_sync:
                oldest_sync = snap.last_synced_at

    return {
        "accounts": all_accounts,
        "last_synced_at": oldest_sync.isoformat() if oldest_sync else None,
        "stale": stale,
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/net-worth
# ---------------------------------------------------------------------------

@router.get("/net-worth")
async def get_net_worth(session: AdminSession) -> dict:
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()

    total_assets: float = 0.0
    total_liabilities: float = 0.0
    accounts: list[dict] = []
    institutions: list[dict] = []
    stale = False
    oldest_sync: datetime | None = None

    for item in items:
        snap = await AccountSnapshot.find_one(AccountSnapshot.item_id == item.item_id)
        if snap is None or _is_stale(snap.last_synced_at, _BALANCE_STALE_HOURS):
            stale = True
            asyncio.create_task(_sync_balances(item))
            if snap is None:
                institutions.append({
                    "item_id": item.item_id,
                    "institution_name": item.institution_name,
                    "assets": 0.0,
                    "liabilities": 0.0,
                })
                continue

        if oldest_sync is None or snap.last_synced_at < oldest_sync:
            oldest_sync = snap.last_synced_at

        inst_assets: float = 0.0
        inst_liabilities: float = 0.0
        for acct in snap.accounts:
            acct_type = acct.get("type", "")
            balances = acct.get("balances", {})
            balance: float = (
                balances.get("available")
                if acct_type == "depository" and balances.get("available") is not None
                else balances.get("current") or 0.0
            ) or 0.0
            accounts.append({
                "account_id": acct.get("account_id"),
                "name": acct.get("name"),
                "type": acct_type,
                "subtype": acct.get("subtype", ""),
                "balance": balance,
                "currency": balances.get("currency", "USD"),
                "institution_name": item.institution_name,
            })
            if acct_type in ("depository", "investment"):
                inst_assets += balance
            elif acct_type in ("credit", "loan"):
                inst_liabilities += balance

        total_assets += inst_assets
        total_liabilities += inst_liabilities
        institutions.append({
            "item_id": item.item_id,
            "institution_name": item.institution_name,
            "assets": inst_assets,
            "liabilities": inst_liabilities,
        })

    return {
        "net_worth": total_assets - total_liabilities,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "accounts": accounts,
        "institutions": institutions,
        "last_synced_at": oldest_sync.isoformat() if oldest_sync else None,
        "stale": stale,
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/transactions  — full cursor-based sync across all items
# ---------------------------------------------------------------------------

@router.get("/transactions")
async def sync_transactions(
    session: AdminSession,
    limit: int = 100,
    offset: int = 0,
    category: str = "",
) -> dict:
    """
    Returns stored transactions for the current user, sorted by date descending.
    Supports pagination via limit/offset and optional category_primary filter.

    On first call (no stored transactions for this user), automatically runs a
    full sync from Plaid first so the frontend never gets an empty response.
    """
    owner_id = PydanticObjectId(str(session.user_id))

    # Auto-sync on cold start — no stored transactions for this user yet
    existing_count = await Transaction.find(Transaction.owner == owner_id).count()
    if existing_count == 0:
        items = await PlaidItem.find(
            PlaidItem.owner == owner_id
        ).to_list()
        for item in items:
            if "transactions" not in (item.products or []):
                continue
            try:
                await _sync_and_store(item)
            except Exception:
                pass

    query = Transaction.find(Transaction.owner == owner_id)
    if category:
        query = query.find(Transaction.category_primary == category)

    total = await query.count()
    txns = (
        await query
        .sort(-Transaction.date)  # type: ignore[arg-type]
        .skip(offset)
        .limit(limit)
        .to_list()
    )

    return {
        "added": [
            {
                "transaction_id": t.transaction_id,
                "account_id": t.account_id,
                "amount": t.amount,
                "date": t.date,
                "name": t.name,
                "merchant_name": t.merchant_name,
                "pending": t.pending,
                "category_primary": t.category_primary,
                "category_detailed": t.category_detailed,
                "institution_name": t.institution_name,
            }
            for t in txns
        ],
        "modified": [],
        "removed": [],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _serialize_transactions(txns: list, institution_name: str) -> list[dict]:
    result = []
    for t in txns:
        pfc = t.get("personal_finance_category") or {}
        result.append(
            {
                "transaction_id": t.get("transaction_id"),
                "account_id": t.get("account_id"),
                "amount": t.get("amount"),  # positive = debit, negative = credit
                "date": str(t.get("date", "")),
                "name": t.get("name"),
                "merchant_name": t.get("merchant_name"),
                "pending": t.get("pending", False),
                "category_primary": pfc.get("primary", ""),
                "category_detailed": pfc.get("detailed", ""),
                "institution_name": institution_name,
            }
        )
    return result


# ---------------------------------------------------------------------------
# _sync_and_store  — shared cursor-sync helper that persists to MongoDB
# ---------------------------------------------------------------------------

async def _sync_and_store(item: PlaidItem) -> None:
    """
    Runs a full cursor-based transactions/sync for a single PlaidItem and
    bulk-upserts the results into the Transaction collection.

    - Added / modified transactions are upserted (ReplaceOne with upsert=True)
      in one bulk_write call per page — one round-trip instead of one per doc.
    - Removed transaction IDs are deleted in a single delete_many call per page.
    - The item's cursor is persisted after all pages complete.

    Raises on Plaid API errors so callers can handle per-item failures.
    """
    client = get_plaid_client()
    raw_token = decrypt_token(item.access_token)
    cursor = item.cursor or ""
    has_more = True
    collection = Transaction.get_motor_collection()

    while has_more:
        sync_kwargs: dict = {"access_token": raw_token}
        if cursor:
            sync_kwargs["cursor"] = cursor
        response = client.transactions_sync(TransactionsSyncRequest(**sync_kwargs))

        # --- upsert added + modified ---
        to_upsert = response["added"] + response["modified"]
        if to_upsert:
            ops = []
            for t in to_upsert:
                pfc = t.get("personal_finance_category") or {}
                doc = {
                    "transaction_id": t.get("transaction_id"),
                    "item_id": item.item_id,
                    "account_id": t.get("account_id") or "",
                    "owner": item.owner,
                    "amount": float(t.get("amount") or 0),
                    "date": str(t.get("date", "")),
                    "name": t.get("name") or "",
                    "merchant_name": t.get("merchant_name"),
                    "pending": bool(t.get("pending", False)),
                    "category_primary": pfc.get("primary", ""),
                    "category_detailed": pfc.get("detailed", ""),
                    "institution_name": item.institution_name,
                }
                ops.append(
                    ReplaceOne({"transaction_id": doc["transaction_id"]}, doc, upsert=True)
                )
            await collection.bulk_write(ops, ordered=False)

        # --- delete removed ---
        removed_ids = [t.get("transaction_id") for t in response["removed"] if t.get("transaction_id")]
        if removed_ids:
            await collection.delete_many({"transaction_id": {"$in": removed_ids}})

        has_more = response["has_more"]
        cursor = response["next_cursor"]

    item.cursor = cursor
    await item.save()


# ---------------------------------------------------------------------------
# Background sync helpers — fetch from Plaid and upsert snapshots
# ---------------------------------------------------------------------------

async def _sync_balances(item: PlaidItem) -> None:
    """Fetch live balances for one item and upsert into AccountSnapshot."""
    client = get_plaid_client()
    raw_token = decrypt_token(item.access_token)
    response = client.accounts_balance_get(AccountsBalanceGetRequest(access_token=raw_token))

    accounts: list[dict] = []
    for acct in response["accounts"]:
        accounts.append({
            "account_id": acct["account_id"],
            "name": acct["name"],
            "official_name": acct.get("official_name"),
            "type": str(acct["type"]),
            "subtype": str(acct.get("subtype", "")),
            "institution_name": item.institution_name,
            "balances": {
                "available": acct["balances"].get("available"),
                "current": acct["balances"].get("current"),
                "currency": acct["balances"].get("iso_currency_code", "USD"),
            },
        })

    now = datetime.now(timezone.utc)
    snap = await AccountSnapshot.find_one(AccountSnapshot.item_id == item.item_id)
    if snap is None:
        await AccountSnapshot(
            item_id=item.item_id, owner=item.owner, accounts=accounts, last_synced_at=now
        ).insert()
    else:
        snap.accounts = accounts
        snap.last_synced_at = now
        await snap.save()


async def _sync_investments(item: PlaidItem) -> None:
    """Fetch investment holdings for one item and upsert into InvestmentSnapshot."""
    client = get_plaid_client()
    raw_token = decrypt_token(item.access_token)
    response = client.investments_holdings_get(InvestmentsHoldingsGetRequest(access_token=raw_token))

    securities: dict[str, dict] = {s["security_id"]: s for s in response["securities"]}
    holdings: list[dict] = []
    total_value: float = 0.0

    for holding in response["holdings"]:
        sec_id = holding.get("security_id", "")
        sec = securities.get(sec_id, {})
        quantity = float(holding.get("quantity") or 0)
        inst_price = float(holding.get("institution_price") or 0)
        market_value = round(quantity * inst_price, 2)
        total_value += market_value
        holdings.append({
            "account_id": holding.get("account_id"),
            "security_id": sec_id,
            "name": sec.get("name") or sec.get("ticker_symbol", "Unknown"),
            "ticker": sec.get("ticker_symbol"),
            "type": str(sec.get("type", "")),
            "quantity": quantity,
            "institution_price": inst_price,
            "market_value": market_value,
            "cost_basis": holding.get("cost_basis"),
            "currency": holding.get("iso_currency_code", "USD"),
            "institution_name": item.institution_name,
        })

    now = datetime.now(timezone.utc)
    snap = await InvestmentSnapshot.find_one(InvestmentSnapshot.item_id == item.item_id)
    if snap is None:
        await InvestmentSnapshot(
            item_id=item.item_id, owner=item.owner,
            holdings=holdings, total_value=round(total_value, 2), last_synced_at=now,
        ).insert()
    else:
        snap.holdings = holdings
        snap.total_value = round(total_value, 2)
        snap.last_synced_at = now
        await snap.save()


async def _sync_liabilities(item: PlaidItem) -> None:
    """Fetch liability data for one item and upsert into LiabilitySnapshot."""
    client = get_plaid_client()
    raw_token = decrypt_token(item.access_token)
    response = client.liabilities_get(LiabilitiesGetRequest(access_token=raw_token))
    liabs = response["liabilities"]
    acct_map: dict[str, str] = {a["account_id"]: a.get("name", "Unknown") for a in response["accounts"]}

    credit_cards: list[dict] = []
    student_loans: list[dict] = []
    mortgages: list[dict] = []
    total_debt: float = 0.0

    for cc in (liabs.get("credit") or []):
        balance = float(cc.get("last_statement_balance") or 0)
        total_debt += balance
        credit_cards.append({
            "account_id": cc.get("account_id"),
            "account_name": acct_map.get(cc.get("account_id", ""), "Unknown"),
            "last_statement_balance": balance,
            "minimum_payment_amount": cc.get("minimum_payment_amount"),
            "next_payment_due_date": str(cc.get("next_payment_due_date", "")),
            "aprs": [
                {
                    "type": str(apr.get("apr_type", "")),
                    "percentage": apr.get("apr_percentage"),
                    "balance": apr.get("balance_subject_to_apr"),
                }
                for apr in (cc.get("aprs") or [])
            ],
            "institution_name": item.institution_name,
        })

    for loan in (liabs.get("student") or []):
        balance = (
            float(loan.get("outstanding_interest_amount") or 0)
            + float(loan.get("origination_principal_amount") or 0)
        )
        total_debt += balance
        student_loans.append({
            "account_id": loan.get("account_id"),
            "account_name": acct_map.get(loan.get("account_id", ""), "Unknown"),
            "loan_name": loan.get("loan_name"),
            "interest_rate": loan.get("interest_rate_percentage"),
            "outstanding_interest": loan.get("outstanding_interest_amount"),
            "origination_principal": loan.get("origination_principal_amount"),
            "next_payment_due_date": str(loan.get("next_payment_due_date", "")),
            "minimum_payment_amount": loan.get("minimum_payment_amount"),
            "institution_name": item.institution_name,
        })

    for mort in (liabs.get("mortgage") or []):
        balance = float(mort.get("outstanding_principal_balance") or 0)
        total_debt += balance
        mortgages.append({
            "account_id": mort.get("account_id"),
            "account_name": acct_map.get(mort.get("account_id", ""), "Unknown"),
            "loan_type": mort.get("loan_type_description"),
            "interest_rate": (mort.get("interest_rate") or {}).get("percentage"),
            "outstanding_principal": mort.get("outstanding_principal_balance"),
            "next_monthly_payment": mort.get("next_monthly_payment"),
            "next_payment_due_date": str(mort.get("next_due_date", "")),
            "origination_principal": mort.get("origination_principal_amount"),
            "institution_name": item.institution_name,
        })

    now = datetime.now(timezone.utc)
    snap = await LiabilitySnapshot.find_one(LiabilitySnapshot.item_id == item.item_id)
    if snap is None:
        await LiabilitySnapshot(
            item_id=item.item_id, owner=item.owner,
            credit_cards=credit_cards, student_loans=student_loans,
            mortgages=mortgages, total_debt=round(total_debt, 2), last_synced_at=now,
        ).insert()
    else:
        snap.credit_cards = credit_cards
        snap.student_loans = student_loans
        snap.mortgages = mortgages
        snap.total_debt = round(total_debt, 2)
        snap.last_synced_at = now
        await snap.save()


async def _sync_recurring(item: PlaidItem) -> None:
    """Fetch recurring streams for one item and upsert into RecurringSnapshot."""
    client = get_plaid_client()
    raw_token = decrypt_token(item.access_token)
    acct_resp = client.accounts_balance_get(AccountsBalanceGetRequest(access_token=raw_token))
    account_ids = [a["account_id"] for a in acct_resp["accounts"]]
    response = client.transactions_recurring_get(
        TransactionsRecurringGetRequest(access_token=raw_token, account_ids=account_ids)
    )

    inflow = [_serialize_stream(s, item.institution_name) for s in response["inflow_streams"]]
    outflow = [_serialize_stream(s, item.institution_name) for s in response["outflow_streams"]]

    now = datetime.now(timezone.utc)
    snap = await RecurringSnapshot.find_one(RecurringSnapshot.item_id == item.item_id)
    if snap is None:
        await RecurringSnapshot(
            item_id=item.item_id, owner=item.owner,
            inflow_streams=inflow, outflow_streams=outflow, last_synced_at=now,
        ).insert()
    else:
        snap.inflow_streams = inflow
        snap.outflow_streams = outflow
        snap.last_synced_at = now
        await snap.save()


async def _full_sync(item: PlaidItem) -> None:
    """Run all applicable syncs for one item. Per-sync errors are isolated."""
    prods = set(item.products or [])
    tasks: list = [_sync_balances]
    if "transactions" in prods:
        tasks.extend([_sync_and_store, _sync_recurring])
    if "investments" in prods:
        tasks.append(_sync_investments)
    if "liabilities" in prods:
        tasks.append(_sync_liabilities)
    for fn in tasks:
        try:
            await fn(item)
        except Exception as exc:
            log.warning("_full_sync %s failed for item %s: %s", fn.__name__, item.item_id, exc)


# ---------------------------------------------------------------------------
# GET /api/plaid/budget  — monthly spend summary for BudgetWidget
# ---------------------------------------------------------------------------

@router.get("/budget")
async def get_budget(session: AdminSession) -> dict:
    owner_id = PydanticObjectId(str(session.user_id))
    now = datetime.now(timezone.utc)
    month_start_str = f"{now.year}-{now.month:02d}-01"
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_elapsed = max(now.day, 1)
    days_remaining = max(days_in_month - now.day, 1)

    # Query stored transactions for the current month, excluding pending
    txns = await Transaction.find(
        Transaction.owner == owner_id,
        Transaction.date >= month_start_str,
        Transaction.pending == False,  # noqa: E712
    ).to_list()

    total_income: float = 0.0
    gross_spent: float = 0.0
    refunds: float = 0.0

    for t in txns:
        amount = t.amount
        primary = t.category_primary
        if amount > 0:
            # Exclude transfers-in and loan payments from spending
            if primary not in ("TRANSFER_IN", "LOAN_PAYMENTS"):
                gross_spent += amount
        else:  # amount < 0  (money received / credit)
            if primary in ("INCOME", "TRANSFER_IN"):
                total_income += abs(amount)
            elif primary not in ("TRANSFER_OUT", "LOAN_PAYMENTS"):
                # Refund on an expense category — net against spending
                refunds += abs(amount)

    total_spent = max(0.0, gross_spent - refunds)

    # Only treat income as the budget ceiling if it's meaningfully large.
    # Tiny interest-only income ($4/month) should not set a $4 budget.
    income_is_meaningful = total_income >= max(total_spent * 0.3, 100.0)
    if income_is_meaningful:
        budget_total = total_income
    else:
        daily_pace = total_spent / days_elapsed if days_elapsed else 0
        budget_total = round(daily_pace * days_in_month, 2)

    remaining = max(budget_total - total_spent, 0.0)
    daily_allowance = remaining / days_remaining if days_remaining else 0.0

    def _fmt(val: float) -> str:
        return f"${val:,.2f}"

    return {
        "remaining": _fmt(remaining),
        "total": round(budget_total, 2),
        "spent": round(total_spent, 2),
        "income": round(total_income, 2),
        "dailyAllowance": _fmt(daily_allowance),
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/money-flow  — monthly income vs expense for bar chart
# ---------------------------------------------------------------------------

@router.get("/money-flow")
async def get_money_flow(session: AdminSession, months: int = 7) -> dict:
    """Return income vs expense aggregated by month for the last N months."""
    owner_id = PydanticObjectId(str(session.user_id))
    now = datetime.now(timezone.utc)

    # Build month buckets going back N months (including current)
    buckets: dict[str, dict[str, float]] = {}
    for i in range(months):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        key = f"{y}-{m:02d}"
        buckets[key] = {"income": 0.0, "expense": 0.0}

    earliest_date_str = f"{min(buckets.keys())}-01"

    # Query stored transactions from the earliest bucket date forward
    txns = await Transaction.find(
        Transaction.owner == owner_id,
        Transaction.date >= earliest_date_str,
        Transaction.pending == False,  # noqa: E712
    ).to_list()

    for t in txns:
        key = t.date[:7]  # "YYYY-MM"
        if key not in buckets:
            continue
        amount = t.amount
        primary = t.category_primary
        if amount > 0:
            if primary not in ("TRANSFER_IN", "LOAN_PAYMENTS"):
                buckets[key]["expense"] += amount
        else:  # amount < 0  (money received / credit)
            if primary in ("INCOME", "TRANSFER_IN"):
                buckets[key]["income"] += abs(amount)
            elif primary not in ("TRANSFER_OUT", "LOAN_PAYMENTS"):
                # Refund — subtract from that month's expenses
                buckets[key]["expense"] = max(0.0, buckets[key]["expense"] - abs(amount))

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]

    result_months = []
    for key in sorted(buckets.keys()):
        y, m = key.split("-")
        result_months.append({
            "month": month_names[int(m) - 1],
            "year": int(y),
            "income": round(buckets[key]["income"], 2),
            "expense": round(buckets[key]["expense"], 2),
        })

    cur_key = f"{now.year}-{now.month:02d}"
    prev_m = now.month - 1
    prev_y = now.year
    if prev_m <= 0:
        prev_m += 12
        prev_y -= 1
    prev_key = f"{prev_y}-{prev_m:02d}"

    cur = buckets.get(cur_key, {"income": 0, "expense": 0})
    prev = buckets.get(prev_key, {"income": 0, "expense": 0})

    def _pct_change(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    return {
        "months": result_months,
        "income_change_pct": _pct_change(cur["income"], prev["income"]),
        "expense_change_pct": _pct_change(cur["expense"], prev["expense"]),
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/recurring  — subscription & bill tracker
# ---------------------------------------------------------------------------

@router.get("/recurring")
async def get_recurring(session: AdminSession) -> dict:
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()

    all_inflow: list[dict] = []
    all_outflow: list[dict] = []
    stale = False
    oldest_sync: datetime | None = None

    for item in items:
        if "transactions" not in (item.products or []):
            continue
        snap = await RecurringSnapshot.find_one(RecurringSnapshot.item_id == item.item_id)
        if snap is None or _is_stale(snap.last_synced_at, _RECURRING_STALE_HOURS):
            stale = True
            asyncio.create_task(_sync_recurring(item))
        if snap is not None:
            all_inflow.extend(snap.inflow_streams)
            all_outflow.extend(snap.outflow_streams)
            if oldest_sync is None or snap.last_synced_at < oldest_sync:
                oldest_sync = snap.last_synced_at

    all_outflow.sort(key=lambda s: s.get("predicted_next_date") or "")

    return {
        "inflow_streams": all_inflow,
        "outflow_streams": all_outflow,
        "last_synced_at": oldest_sync.isoformat() if oldest_sync else None,
        "stale": stale,
    }


def _serialize_stream(stream: dict, institution_name: str) -> dict:
    return {
        "stream_id": stream.get("stream_id"),
        "account_id": stream.get("account_id"),
        "description": stream.get("description") or stream.get("merchant_name", ""),
        "merchant_name": stream.get("merchant_name"),
        "frequency": str(stream.get("frequency", "")),
        "average_amount": (stream.get("average_amount") or {}).get("amount"),
        "last_amount": (stream.get("last_amount") or {}).get("amount"),
        "last_date": str(stream.get("last_date", "")),
        "predicted_next_date": str(stream.get("predicted_next_date", "")),
        "status": str(stream.get("status", "")),
        "is_active": stream.get("is_active", True),
        "category": (stream.get("personal_finance_category") or {}).get("primary", ""),
        "institution_name": institution_name,
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/investments  — portfolio holdings
# ---------------------------------------------------------------------------

@router.get("/investments")
async def get_investments(session: AdminSession) -> dict:
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()

    all_holdings: list[dict] = []
    total_value: float = 0.0
    stale = False
    oldest_sync: datetime | None = None

    for item in items:
        if "investments" not in (item.products or []):
            continue
        snap = await InvestmentSnapshot.find_one(InvestmentSnapshot.item_id == item.item_id)
        if snap is None or _is_stale(snap.last_synced_at, _INVESTMENT_STALE_HOURS):
            stale = True
            asyncio.create_task(_sync_investments(item))
        if snap is not None:
            all_holdings.extend(snap.holdings)
            total_value += snap.total_value
            if oldest_sync is None or snap.last_synced_at < oldest_sync:
                oldest_sync = snap.last_synced_at

    all_holdings.sort(key=lambda h: -(h.get("market_value") or 0))

    return {
        "holdings": all_holdings,
        "total_value": round(total_value, 2),
        "last_synced_at": oldest_sync.isoformat() if oldest_sync else None,
        "stale": stale,
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/liabilities  — credit cards, loans, student debt
# ---------------------------------------------------------------------------

@router.get("/liabilities")
async def get_liabilities(session: AdminSession) -> dict:
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()

    credit_cards: list[dict] = []
    student_loans: list[dict] = []
    mortgages: list[dict] = []
    total_debt: float = 0.0
    stale = False
    oldest_sync: datetime | None = None

    for item in items:
        if "liabilities" not in (item.products or []):
            continue
        snap = await LiabilitySnapshot.find_one(LiabilitySnapshot.item_id == item.item_id)
        if snap is None or _is_stale(snap.last_synced_at, _LIABILITY_STALE_HOURS):
            stale = True
            asyncio.create_task(_sync_liabilities(item))
        if snap is not None:
            credit_cards.extend(snap.credit_cards)
            student_loans.extend(snap.student_loans)
            mortgages.extend(snap.mortgages)
            total_debt += snap.total_debt
            if oldest_sync is None or snap.last_synced_at < oldest_sync:
                oldest_sync = snap.last_synced_at

    return {
        "credit_cards": credit_cards,
        "student_loans": student_loans,
        "mortgages": mortgages,
        "total_debt": round(total_debt, 2),
        "last_synced_at": oldest_sync.isoformat() if oldest_sync else None,
        "stale": stale,
    }


# ---------------------------------------------------------------------------
# Webhook signature verification helper
# ---------------------------------------------------------------------------

async def _verify_plaid_webhook(raw_body: bytes, token: str) -> None:
    """
    Verify the Plaid-Verification JWT using Plaid's published public key.

    Flow:
    1. Decode JWT header (no verification) to extract `kid` and `alg`.
    2. Fetch the JWK from Plaid by `kid` (result cached in-process by kid).
    3. Verify the JWT signature using python-jose.
    4. Compare request body SHA-256 hash against the `request_body_sha256` claim.

    Raises HTTPException(400) on any failure so Plaid receives a non-200 and
    knows to retry or alert.
    """
    import base64
    import json as _json
    from jose import jwt as jose_jwt, jwk as jose_jwk, JWTError

    # 1. Extract kid / alg from unverified header
    try:
        header_segment = token.split(".")[0]
        padded = header_segment + "=" * (-len(header_segment) % 4)
        header = _json.loads(base64.urlsafe_b64decode(padded))
        kid: str = header["kid"]
        alg: str = header.get("alg", "ES256")
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed Plaid-Verification JWT header")

    # 2. Fetch JWK from Plaid (cached by kid to avoid repeated API calls)
    if kid not in _webhook_key_cache:
        try:
            client = get_plaid_client()
            key_resp = client.webhook_verification_key_get(
                WebhookVerificationKeyGetRequest(key_id=kid)
            )
            key_obj = key_resp["key"]
            _webhook_key_cache[kid] = {
                "kty": key_obj.get("kty"),
                "crv": key_obj.get("crv"),
                "kid": key_obj.get("kid"),
                "alg": key_obj.get("alg"),
                "use": key_obj.get("use"),
                "x": key_obj.get("x"),
                "y": key_obj.get("y"),
            }
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not fetch Plaid webhook key: {exc}")

    # 3. Verify JWT signature
    try:
        public_key = jose_jwk.construct(_webhook_key_cache[kid], algorithm=alg)
        claims = jose_jwt.decode(token, public_key, algorithms=[alg])
    except JWTError as exc:
        _webhook_key_cache.pop(kid, None)  # evict possibly stale cached key
        raise HTTPException(status_code=400, detail=f"Webhook signature invalid: {exc}")

    # 4. Verify body hash
    import hashlib
    expected = hashlib.sha256(raw_body).hexdigest()
    if claims.get("request_body_sha256") != expected:
        raise HTTPException(status_code=400, detail="Webhook body hash mismatch")


# ---------------------------------------------------------------------------
# POST /api/plaid/webhook  — receive Plaid webhook events
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def plaid_webhook(request: Request) -> dict:
    """
    Receives Plaid webhook events and kicks off background syncs.

    Signature verification is enabled by setting PLAID_WEBHOOK_VERIFICATION=true
    (recommended for production; disabled by default for local development).

    Webhook types handled:
    - TRANSACTIONS / SYNC_UPDATES_AVAILABLE|DEFAULT_UPDATE → transaction + recurring sync
    - TRANSACTIONS / RECURRING_TRANSACTIONS_UPDATE          → recurring sync
    - HOLDINGS / DEFAULT_UPDATE                             → investment sync
    - LIABILITIES / DEFAULT_UPDATE                          → liability sync
    """
    raw_body = await request.body()

    if os.getenv("PLAID_WEBHOOK_VERIFICATION", "false").lower() == "true":
        verification_header = request.headers.get("Plaid-Verification", "")
        if not verification_header:
            raise HTTPException(status_code=400, detail="Missing Plaid-Verification header")
        await _verify_plaid_webhook(raw_body, verification_header)

    try:
        import json as _json
        payload: dict = _json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    webhook_type = payload.get("webhook_type", "")
    webhook_code = payload.get("webhook_code", "")
    item_id = payload.get("item_id", "")

    if item_id:
        item = await PlaidItem.find_one(PlaidItem.item_id == item_id)
        if item:
            prods = set(item.products or [])
            if webhook_type == "TRANSACTIONS" and webhook_code in (
                "SYNC_UPDATES_AVAILABLE", "DEFAULT_UPDATE"
            ):
                if "transactions" in prods:
                    asyncio.create_task(_sync_and_store(item))
                    asyncio.create_task(_sync_recurring(item))
            elif webhook_type == "TRANSACTIONS" and webhook_code == "RECURRING_TRANSACTIONS_UPDATE":
                if "transactions" in prods:
                    asyncio.create_task(_sync_recurring(item))
            elif webhook_type == "HOLDINGS" and webhook_code == "DEFAULT_UPDATE":
                if "investments" in prods:
                    asyncio.create_task(_sync_investments(item))
            elif webhook_type == "LIABILITIES" and webhook_code == "DEFAULT_UPDATE":
                if "liabilities" in prods:
                    asyncio.create_task(_sync_liabilities(item))

    return {"received": True, "webhook_type": webhook_type, "webhook_code": webhook_code}


# ---------------------------------------------------------------------------
# POST /api/plaid/transactions/refresh  — force immediate bank check
# ---------------------------------------------------------------------------

@router.post("/transactions/refresh")
async def refresh_transactions(session: AdminSession) -> dict:
    """
    Calls Plaid's /transactions/refresh for each linked item, which signals
    Plaid to immediately pull new transactions from the institution rather than
    waiting for the next automatic check (which runs 1-4x/day per institution).

    After requesting the refresh, runs _sync_and_store to pull any new data
    into MongoDB right away.

    NOTE: In full Production this endpoint is billed as an add-on feature.
    In Sandbox and Development it is available at no extra cost.
    """
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()
    client = get_plaid_client()
    results = []

    for item in items:
        if "transactions" not in (item.products or []):
            continue
        try:
            raw_token = decrypt_token(item.access_token)
            # Ask Plaid to immediately check the bank for new transactions
            client.transactions_refresh(TransactionsRefreshRequest(access_token=raw_token))
            # Pull whatever Plaid found into our DB
            await _sync_and_store(item)
            results.append({"item_id": item.item_id, "institution_name": item.institution_name, "status": "refreshed"})
        except Exception as exc:
            results.append({"item_id": item.item_id, "institution_name": item.institution_name, "error": str(exc)})

    return {"results": results}


# ---------------------------------------------------------------------------
# DELETE /api/plaid/clear  — remove ALL Plaid data for the current user
# ---------------------------------------------------------------------------

@router.delete("/clear")
async def clear_all_plaid_data(session: AdminSession) -> dict:
    """
    Removes every piece of Plaid-related data for the current user:
    - Calls Plaid's item_remove for each linked item (best-effort)
    - Deletes all PlaidItem, Transaction, and snapshot documents
    """
    owner_id = PydanticObjectId(str(session.user_id))
    items = await PlaidItem.find(PlaidItem.owner == owner_id).to_list()

    client = get_plaid_client()
    for item in items:
        try:
            raw_token = decrypt_token(item.access_token)
            client.item_remove(ItemRemoveRequest(access_token=raw_token))
        except Exception:
            pass  # already removed on Plaid's side — still clean up locally

    item_ids = [item.item_id for item in items]

    # Delete all local data for this user
    col = Transaction.get_motor_collection()
    await col.delete_many({"owner": owner_id})
    await AccountSnapshot.get_motor_collection().delete_many({"owner": owner_id})
    await InvestmentSnapshot.get_motor_collection().delete_many({"owner": owner_id})
    await LiabilitySnapshot.get_motor_collection().delete_many({"owner": owner_id})
    await RecurringSnapshot.get_motor_collection().delete_many({"owner": owner_id})
    await PlaidItem.get_motor_collection().delete_many({"owner": owner_id})

    return {"status": "cleared", "items_removed": len(item_ids)}


# ---------------------------------------------------------------------------
# POST /api/plaid/sandbox/fire-webhook  — manually trigger a Plaid webhook
# ---------------------------------------------------------------------------

class FireWebhookRequest(BaseModel):
    item_id: str
    webhook_code: str = "SYNC_UPDATES_AVAILABLE"


@router.post("/sandbox/fire-webhook")
async def fire_sandbox_webhook(body: FireWebhookRequest, session: AdminSession) -> dict:
    """Fires a sandbox webhook for the given item_id to test end-to-end webhook handling."""
    item = await PlaidItem.find_one(
        PlaidItem.item_id == body.item_id,
        PlaidItem.owner == PydanticObjectId(str(session.user_id)),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    client = get_plaid_client()
    try:
        raw_token = decrypt_token(item.access_token)
        response = client.sandbox_item_fire_webhook(
            SandboxItemFireWebhookRequest(
                access_token=raw_token,
                webhook_code=body.webhook_code,
            )
        )
        return {"fired": response.get("webhook_fired", True)}
    except Exception as exc:
        return _plaid_error(exc)
