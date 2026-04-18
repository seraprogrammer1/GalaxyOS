from datetime import datetime
from beanie import Document, PydanticObjectId


class RecurringSnapshot(Document):
    """
    Cached recurring-transactions snapshot for a single PlaidItem.

    Refreshed in the background when stale; served immediately from MongoDB.
    """

    item_id: str
    owner: PydanticObjectId
    inflow_streams: list[dict]
    outflow_streams: list[dict]
    last_synced_at: datetime

    class Settings:
        name = "recurring_snapshots"
        indexes = [
            [("item_id", 1)],
            [("owner", 1)],
        ]
