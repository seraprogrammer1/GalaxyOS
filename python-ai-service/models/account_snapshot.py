from datetime import datetime
from beanie import Document, PydanticObjectId


class AccountSnapshot(Document):
    """
    Cached balance snapshot for a single PlaidItem (linked institution).

    Refreshed in the background when stale; served immediately from MongoDB
    so balance/net-worth reads never block on a Plaid API call.
    """

    item_id: str                # FK → PlaidItem.item_id
    owner: PydanticObjectId     # FK → user/admin
    accounts: list[dict]        # serialised account+balance dicts from Plaid
    last_synced_at: datetime

    class Settings:
        name = "account_snapshots"
        indexes = [
            [("item_id", 1)],
            [("owner", 1)],
        ]
