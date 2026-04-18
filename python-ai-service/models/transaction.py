from typing import Optional
from beanie import Document, PydanticObjectId


class Transaction(Document):
    """
    Persisted Plaid transaction record.

    Security: No access tokens, account numbers, or SSNs are stored here.
    Only Plaid-enriched data (amounts, merchant names, categories) which is
    not credential-class. Access is gated by the `owner` field combined with
    require_admin on every route. Plaid access tokens remain Fernet-encrypted
    in PlaidItem. Plaid Developer Policy is satisfied by MongoDB at-rest
    encryption + TLS in transit for this class of data.
    """

    transaction_id: str
    item_id: str
    account_id: str
    owner: PydanticObjectId
    amount: float                          # positive = debit/expense, negative = income/credit
    date: str                              # "YYYY-MM-DD" — sorts lexicographically
    name: str
    merchant_name: Optional[str] = None
    pending: bool = False
    category_primary: str = ""
    category_detailed: str = ""
    institution_name: str = ""

    class Settings:
        name = "transactions"
        indexes = [
            [("transaction_id", 1)],       # unique — Plaid IDs are globally unique
            [("owner", 1), ("date", -1)],  # primary query pattern: user's txns by date
            [("item_id", 1)],              # for item-scoped deletes on unlink
        ]
