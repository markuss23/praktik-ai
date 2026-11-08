"""Tracker průběhu AI generování (kurz, cover kurzu, obrázek modulu, podcast), uložený v DB
(tabulka generation_progress).

Stav musí být sdílený mezi workery gunicornu: generování běží v jednom
procesu, ale polling průběhu může trefit kterýkoliv jiný.

Záznamy jsou klíčované řetězcem ``course:<id>`` (generování kurzu),
``course-image:<id>`` (cover kurzu), ``module-image:<id>`` (obrázek modulu)
a ``module-podcast:<id>`` (podcast modulu).

Běžící task každých ``HEARTBEAT`` obnoví ``updated_at`` (viz ``run_tracked``).
Když proces s generováním spadne, řádek zůstane ``running``. Po ``STALE_AFTER``
bez aktualizace ho bereme za mrtvý a generování jde spustit znovu.

Odkazy na asyncio tasky zůstávají procesově-lokální — jen proto,
aby je sběrač paměti nezahodil.
"""

import asyncio
from collections.abc import Awaitable
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.postgresql import insert

from api.database import engine
from api.models import GenerationProgress as Row

HEARTBEAT = timedelta(minutes=1)
STALE_AFTER = timedelta(minutes=3)


@dataclass
class GenerationProgress:
    step: int
    total: int
    label: str
    status: str  # pending | running | completed | failed
    error: str | None
    result: dict | None
    updated_at: datetime


_running_tasks: dict[str, asyncio.Task] = {}


def course_key(course_id: int) -> str:
    return f"course:{course_id}"


def image_key(kind: str, entity_id: int) -> str:
    """Klíč pro obrázek; kind je "course" nebo "module"."""
    return f"{kind}-image:{entity_id}"


def podcast_key(module_id: int) -> str:
    return f"module-podcast:{module_id}"


def _alive_cond():
    """Řádek, který reprezentuje opravdu běžící generování."""
    return (Row.status == "running") & (
        Row.updated_at > datetime.now(UTC) - STALE_AFTER
    )


def _upsert(key: str, **values) -> None:
    values["updated_at"] = datetime.now(UTC)
    stmt = insert(Row).values(key=key, **values)
    stmt = stmt.on_conflict_do_update(index_elements=[Row.key], set_=values)
    with engine.begin() as conn:
        conn.execute(stmt)


def try_start(key: str, total: int) -> bool:
    """Atomicky zabere generování. False = už běží (v jakémkoliv workeru)."""
    values = dict(
        step=0,
        total=total,
        label="Spouštění generování",
        status="running",
        error=None,
        result=None,
        updated_at=datetime.now(UTC),
    )
    stmt = insert(Row).values(key=key, **values)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Row.key],
        set_=values,
        where=or_(
            Row.status != "running",
            Row.updated_at <= datetime.now(UTC) - STALE_AFTER,
        ),
    ).returning(Row.key)
    with engine.begin() as conn:
        return conn.execute(stmt).first() is not None


def set_progress(key: str | None, step: int, label: str) -> None:
    """Zapíše aktuální krok. Při key None (běh mimo background task) nic nedělá."""
    if key is None:
        return
    _upsert(key, step=step, label=label, status="running", error=None)


def mark_completed(key: str, result: dict | None = None) -> None:
    changes = dict(
        step=Row.total,
        label="Dokončeno",
        status="completed",
        error=None,
        result=result,
        updated_at=datetime.now(UTC),
    )
    with engine.begin() as conn:
        conn.execute(update(Row).where(Row.key == key).values(**changes))


def mark_failed(key: str, error: str) -> None:
    # Krok a popisek ponecháme, ať je vidět, kde to spadlo.
    with engine.begin() as conn:
        conn.execute(
            update(Row)
            .where(Row.key == key)
            .values(status="failed", error=error, updated_at=datetime.now(UTC))
        )


def _touch(key: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            update(Row)
            .where(Row.key == key, Row.status == "running")
            .values(updated_at=datetime.now(UTC))
        )


async def run_tracked(key: str, coro: Awaitable):
    """Počká na ``coro`` a mezitím každých ``HEARTBEAT`` obnovuje ``updated_at``.

    Dlouhý krok (LLM, image model) tak nevypadá jako mrtvý. Spadne-li proces,
    heartbeat přestane a řádek po ``STALE_AFTER`` zestárne.
    """

    async def beat():
        while True:
            await asyncio.sleep(HEARTBEAT.total_seconds())
            _touch(key)

    hb = asyncio.create_task(beat())
    try:
        return await coro
    finally:
        hb.cancel()


def get_progress(key: str) -> GenerationProgress | None:
    """None = server o generování neví (žádný záznam, nebo mrtvý ``running``)."""
    with engine.connect() as conn:
        r = conn.execute(select(Row).where(Row.key == key)).first()
    if r is None:
        return None
    if r.status == "running" and r.updated_at <= datetime.now(UTC) - STALE_AFTER:
        return None
    return GenerationProgress(
        step=r.step,
        total=r.total,
        label=r.label,
        status=r.status,
        error=r.error,
        result=r.result,
        updated_at=r.updated_at,
    )


def register_task(key: str, task: asyncio.Task) -> None:
    """Uloží referenci na běžící asyncio task, aby ho GC nezahodil."""
    _running_tasks[key] = task


def unregister_task(key: str) -> None:
    _running_tasks.pop(key, None)


def list_running_keys(*prefixes: str) -> list[str]:
    """Vrátí klíče právě běžících generování začínající některým z prefixů."""
    with engine.connect() as conn:
        return list(
            conn.execute(
                select(Row.key).where(
                    _alive_cond(), or_(*(Row.key.startswith(p) for p in prefixes))
                )
            ).scalars()
        )
