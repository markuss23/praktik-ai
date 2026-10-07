"""Periodická synchronizace GitHub wiki na pozadí přes APScheduler."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text

from agents.wiki.agent.service import sync_wiki
from agents.wiki.vector_store import WIKI_COLLECTION_NAME
from api.config import settings
from api.database import engine

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def _wiki_index_is_empty() -> bool:
    """Je kolekce wiki embeddingů prázdná?

    Rozhoduje o tom, jestli se má wiki naindexovat hned po startu. Když
    tabulky PGVectoru ještě neexistují (čerstvá databáze), bereme to taky
    jako prázdno — sync je při prvním zápisu sám založí.
    """
    query = text(
        "SELECT EXISTS ("
        "  SELECT 1 FROM langchain_pg_embedding e"
        "  JOIN langchain_pg_collection c ON c.uuid = e.collection_id"
        "  WHERE c.name = :name"
        ")"
    )
    try:
        with engine.connect() as conn:
            return not conn.execute(query, {"name": WIKI_COLLECTION_NAME}).scalar()
    except Exception:
        logger.exception("Nepodařilo se zjistit stav wiki indexu, beru ho jako prázdný")
        return True


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

    ``IntervalTrigger`` odpaluje poprvé až za celý interval, takže na
    čerstvém prostředí by wiki chat prvních 12 hodin neměl z čeho odpovídat
    (a s ``uvicorn --reload`` se odpočet navíc resetuje při každé změně kódu).
    Když je proto index prázdný, pustíme sync hned po startu; naplněný index
    čeká na interval nebo na ruční spuštění z administrace.
    """
    scheduler.add_job(
        _run_wiki_sync_job,
        trigger=IntervalTrigger(hours=settings.wiki.sync_interval_hours),
        id="wiki_sync",
        replace_existing=True,
    )
    if not scheduler.running:
        scheduler.start()

    if _wiki_index_is_empty():
        logger.info("Wiki index je prázdný, spouštím úvodní synchronizaci")
        scheduler.add_job(
            _run_wiki_sync_job,
            id="wiki_sync_bootstrap",
            replace_existing=True,
        )


def stop_wiki_sync_scheduler() -> None:
    """Vypne scheduler, pokud běží."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
