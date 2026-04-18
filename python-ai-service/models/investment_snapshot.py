from datetime import datetime
from beanie import Document, PydanticObjectId


class InvestmentSnapshot(Document):
    """
    Cached investment holdings snapshot for a single PlaidItem.

    Refreshed in the background when stale; served immediately from MongoDB.
    """

    item_id: str
    owner: PydanticObjectId
    holdings: list[dict]        # serialised holding dicts from Plaid
    total_value: float
    last_synced_at: datetime

    class Settings:
        name = "investment_snapshots"
        indexes = [
            [("item_id", 1)],
            [("owner", 1)],
        ]
