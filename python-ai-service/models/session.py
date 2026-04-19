from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId


class Session(Document):
    token: str
    user_id: Optional[PydanticObjectId] = None
    role: str
    ip_type: str
    expires_at: datetime

    class Settings:
        name = "sessions"
