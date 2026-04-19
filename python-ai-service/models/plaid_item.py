from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId


class PlaidItem(Document):
    owner: PydanticObjectId
    access_token: str  # Fernet-encrypted before storage
    item_id: str
    institution_name: str
    institution_id: str
    cursor: Optional[str] = None  # Plaid transaction sync cursor
    products: list[str] = []     # products this item was linked with

    class Settings:
        name = "plaid_items"
        indexes = [
            [("item_id", 1)],         # unique index declared below
            [("owner", 1)],
        ]
