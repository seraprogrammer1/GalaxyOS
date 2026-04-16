import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

_client: AsyncIOMotorClient | None = None


async def connect_db(document_models: list) -> None:
    global _client
    if _client is not None:
        return

    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set")

    _client = AsyncIOMotorClient(uri)
    db_name = uri.rstrip("/").rsplit("/", 1)[-1] or "galaxyos"
    await init_beanie(database=_client[db_name], document_models=document_models)


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
