from datetime import datetime
from beanie import Document, PydanticObjectId


class LiabilitySnapshot(Document):
    """
    Cached liabilities snapshot for a single PlaidItem.

    Refreshed in the background when stale; served immediately from MongoDB.
    """

    item_id: str
    owner: PydanticObjectId
    credit_cards: list[dict]
    student_loans: list[dict]
    mortgages: list[dict]
    total_debt: float
    last_synced_at: datetime

    class Settings:
        name = "liability_snapshots"
        indexes = [
            [("item_id", 1)],
            [("owner", 1)],
        ]
