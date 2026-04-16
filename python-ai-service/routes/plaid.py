from __future__ import annotations

import calendar
from datetime import datetime, timezone
from typing import Annotated, Any

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import Session, require_admin
from encryption import decrypt_token, encrypt_token
from models.plaid_item import PlaidItem
from plaid_client import get_plaid_client

import plaid
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.item_remove_request import ItemRemoveRequest
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


def _current_month_range() -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    first_ts = int(datetime(now.year, now.month, 1, tzinfo=timezone.utc).timestamp())
    last_day = calendar.monthrange(now.year, now.month)[1]
    last_ts = int(datetime(now.year, now.month, last_day, 23, 59, 59, tzinfo=timezone.utc).timestamp())
    return first_ts, last_ts


# ---------------------------------------------------------------------------
# POST /api/plaid/create-link-token
# ---------------------------------------------------------------------------

@router.post("/create-link-token")
async def create_link_token(session: AdminSession) -> dict:
    client = get_plaid_client()
    try:
        request = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="GalaxyOS",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(
                client_user_id=str(session.user_id or "admin")
            ),
        )
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
        await existing.save()
        return {"status": "updated", "item_id": item_id}

    item = PlaidItem(
        owner=PydanticObjectId(str(session.user_id)),
        access_token=encrypt_token(raw_access_token),
        item_id=item_id,
        institution_name=body.institution_name,
        institution_id=body.institution_id,
    )
    await item.insert()
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
    return {"status": "removed", "item_id": item_id}


# ---------------------------------------------------------------------------
# GET /api/plaid/accounts
# ---------------------------------------------------------------------------

@router.get("/accounts")
async def get_accounts(session: AdminSession) -> dict:
    items = await PlaidItem.find(
        PlaidItem.owner == PydanticObjectId(str(session.user_id))
    ).to_list()

    client = get_plaid_client()
    all_accounts: list[dict] = []

    for item in items:
        try:
            raw_token = decrypt_token(item.access_token)
            response = client.accounts_balance_get(
                AccountsBalanceGetRequest(access_token=raw_token)
            )
            for acct in response["accounts"]:
                all_accounts.append(
                    {
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
                    }
                )
        except Exception as exc:
            # Skip failed institutions rather than aborting entirely
            all_accounts.append(
                {"error": str(exc), "institution_name": item.institution_name}
            )

    return {"accounts": all_accounts}


# ---------------------------------------------------------------------------
# GET /api/plaid/net-worth
# ---------------------------------------------------------------------------

@router.get("/net-worth")
async def get_net_worth(session: AdminSession) -> dict:
    items = await PlaidItem.find(
        PlaidItem.owner == PydanticObjectId(str(session.user_id))
    ).to_list()

    client = get_plaid_client()
    total_assets: float = 0.0
    total_liabilities: float = 0.0
    accounts: list[dict] = []
    institutions: list[dict] = []

    for item in items:
        try:
            raw_token = decrypt_token(item.access_token)
            response = client.accounts_balance_get(
                AccountsBalanceGetRequest(access_token=raw_token)
            )
            inst_assets: float = 0.0
            inst_liabilities: float = 0.0

            for acct in response["accounts"]:
                acct_type = str(acct["type"])
                balances = acct["balances"]
                # Prefer available balance for depository; fall back to current
                balance = (
                    balances.get("available")
                    if acct_type == "depository" and balances.get("available") is not None
                    else balances.get("current") or 0.0
                )

                record: dict[str, Any] = {
                    "account_id": acct["account_id"],
                    "name": acct["name"],
                    "type": acct_type,
                    "subtype": str(acct.get("subtype", "")),
                    "balance": balance,
                    "currency": balances.get("iso_currency_code", "USD"),
                    "institution_name": item.institution_name,
                }
                accounts.append(record)

                if acct_type in ("depository", "investment"):
                    inst_assets += balance
                elif acct_type in ("credit", "loan"):
                    inst_liabilities += balance

            total_assets += inst_assets
            total_liabilities += inst_liabilities
            institutions.append(
                {
                    "item_id": item.item_id,
                    "institution_name": item.institution_name,
                    "assets": inst_assets,
                    "liabilities": inst_liabilities,
                }
            )
        except Exception as exc:
            institutions.append(
                {
                    "item_id": item.item_id,
                    "institution_name": item.institution_name,
                    "error": str(exc),
                }
            )

    return {
        "net_worth": total_assets - total_liabilities,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "accounts": accounts,
        "institutions": institutions,
    }


# ---------------------------------------------------------------------------
# GET /api/plaid/transactions  — full cursor-based sync across all items
# ---------------------------------------------------------------------------

@router.get("/transactions")
async def sync_transactions(session: AdminSession) -> dict:
    items = await PlaidItem.find(
        PlaidItem.owner == PydanticObjectId(str(session.user_id))
    ).to_list()

    client = get_plaid_client()
    all_added: list[dict] = []
    all_modified: list[dict] = []
    all_removed: list[dict] = []

    for item in items:
        try:
            raw_token = decrypt_token(item.access_token)
            cursor = item.cursor or ""
            has_more = True

            while has_more:
                request = TransactionsSyncRequest(
                    access_token=raw_token,
                    cursor=cursor if cursor else None,
                )
                response = client.transactions_sync(request)

                all_added.extend(_serialize_transactions(response["added"], item.institution_name))
                all_modified.extend(_serialize_transactions(response["modified"], item.institution_name))
                all_removed.extend([{"transaction_id": t["transaction_id"]} for t in response["removed"]])

                has_more = response["has_more"]
                cursor = response["next_cursor"]

            # Persist updated cursor
            item.cursor = cursor
            await item.save()

        except Exception as exc:
            # Don't abort — include error signal and continue other items
            all_added.append({"error": str(exc), "institution_name": item.institution_name})

    return {"added": all_added, "modified": all_modified, "removed": all_removed}


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
# GET /api/plaid/budget  — monthly spend summary for BudgetWidget
# ---------------------------------------------------------------------------

@router.get("/budget")
async def get_budget(session: AdminSession) -> dict:
    items = await PlaidItem.find(
        PlaidItem.owner == PydanticObjectId(str(session.user_id))
    ).to_list()

    client = get_plaid_client()
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_elapsed = max(now.day, 1)
    days_remaining = max(days_in_month - now.day, 1)

    total_income: float = 0.0
    total_spent: float = 0.0

    for item in items:
        try:
            raw_token = decrypt_token(item.access_token)
            cursor = item.cursor or ""
            has_more = True

            while has_more:
                request = TransactionsSyncRequest(
                    access_token=raw_token,
                    cursor=cursor if cursor else None,
                )
                response = client.transactions_sync(request)

                for t in response["added"] + response["modified"]:
                    if t.get("pending"):
                        continue
                    try:
                        tx_date = datetime.fromisoformat(str(t.get("date", ""))).replace(tzinfo=timezone.utc)
                    except (ValueError, TypeError):
                        continue
                    if tx_date < month_start:
                        continue

                    amount: float = float(t.get("amount") or 0)
                    pfc = t.get("personal_finance_category") or {}
                    primary = pfc.get("primary", "")

                    if amount > 0:
                        # Plaid: positive = money out (debit / expense)
                        if primary not in ("TRANSFER_IN", "LOAN_PAYMENTS"):
                            total_spent += amount
                    else:
                        # negative = money in (income / credit)
                        if primary in ("INCOME", "TRANSFER_IN"):
                            total_income += abs(amount)

                has_more = response["has_more"]
                cursor = response["next_cursor"]

            item.cursor = cursor
            await item.save()

        except Exception:
            continue

    # Derive a budget total: use detected income if present, else fall back to
    # a rough extrapolation from current month spending pace.
    if total_income > 0:
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
        "dailyAllowance": _fmt(daily_allowance),
    }
