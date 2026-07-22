"""Periodická synchronizace GitHub wiki na pozadí přes APScheduler."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from agents.wiki.agent.service import sync_wiki
from api.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _run_wiki_sync_job() -> None:
    try:
        result = await sync_wiki()
        logger.info(
            "Periodická synchronizace wiki dokončena, zpracováno %d stránek",
            result.pages_processed,
        )
    except Exception:
        logger.exception("Periodická synchronizace wiki selhala")


def start_wiki_sync_scheduler() -> None:
    """Zaregistruje periodický job pro sync wiki a spustí scheduler.

    Interval je řízen konfigurací ``settings.wiki.sync_interval_hours``.
    Volání je idempotentní, aby opakovaný start (např. při reloadu) job
    nezdvojoval.
    """
    scheduler.add_job(
        _run_wiki_sync_job,
        trigger=IntervalTrigger(hours=settings.wiki.sync_interval_hours),
        id="wiki_sync",
        replace_existing=True,
    )
    if not scheduler.running:
        scheduler.start()


def stop_wiki_sync_scheduler() -> None:
    """Vypne scheduler, pokud běží."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
