from datetime import datetime, timezone
from typing import Annotated
from fastapi import Depends, Header, HTTPException
from models.session import Session


async def require_admin(
    x_session_token: Annotated[str | None, Header()] = None,
) -> Session:
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Missing session token")

    session = await Session.find_one(Session.token == x_session_token)
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid session token")

    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    if session.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return session
