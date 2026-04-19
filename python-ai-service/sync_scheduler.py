"""
Background scheduler for keeping Plaid snapshot data fresh in MongoDB.

Uses APScheduler (3.x) AsyncIOScheduler so the job runs inside the same
event loop as FastAPI — no extra threads or processes needed.

The job interval is controlled by the SYNC_INTERVAL_HOURS env var (default 4).
"""
from __future__ import annotations

import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _sync_all_items() -> None:
    """Sync every linked PlaidItem for every user. Errors per-item are isolated."""
    from models.plaid_item import PlaidItem
    from routes.plaid import _full_sync

    try:
        items = await PlaidItem.find_all().to_list()
    except Exception as exc:
        log.error("sync_all_items: could not fetch PlaidItems: %s", exc)
        return

    log.info("sync_all_items: syncing %d item(s)", len(items))
    for item in items:
        try:
            await _full_sync(item)
            log.info(
                "sync_all_items: synced %s (%s)", item.item_id, item.institution_name
            )
        except Exception as exc:
            log.warning(
                "sync_all_items: error syncing item %s: %s", item.item_id, exc
            )


async def start_scheduler() -> None:
    global _scheduler
    interval_hours = float(os.getenv("SYNC_INTERVAL_HOURS", "4"))
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _sync_all_items,
        "interval",
        hours=interval_hours,
        id="plaid_sync_all",
        replace_existing=True,
    )
    _scheduler.start()
    log.info("Plaid background sync scheduler started (interval: %sh)", interval_hours)


async def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("Plaid background sync scheduler stopped")
    _scheduler = None
