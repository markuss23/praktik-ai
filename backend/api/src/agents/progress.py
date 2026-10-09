"""Tracker průběhu AI generování kurzu, uložený v DB (tabulka course_generation_progress).

Stav musí být sdílený mezi workery gunicornu: generování běží v jednom
procesu, ale polling průběhu může trefit kterýkoliv jiný.

Pokud proces s generováním spadne, zůstane řádek ve stavu ``running``.
Takový záznam bereme po ``STALE_AFTER`` bez aktualizace za mrtvý.

Odkazy na asyncio tasky zůstávají procesově-lokální — jen proto,
aby je sběrač paměti nezahodil.
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert

from api.database import engine
from api.models import CourseGenerationProgress as Row

# ponytail: pevný timeout bez heartbeatu — krok delší než tohle se bere jako mrtvý;
# kdyby nějaký krok trval déle, přidat periodický heartbeat do _run_course_generation.
STALE_AFTER = timedelta(minutes=30)


@dataclass
class GenerationProgress:
    step: int
    total: int
    label: str
    status: str  # pending | running | completed | failed
    error: str | None
    updated_at: datetime


_running_tasks: dict[int, asyncio.Task] = {}


def _alive_cond():
    """Řádek, který reprezentuje opravdu běžící generování."""
    return (Row.status == "running") & (
        Row.updated_at > datetime.now(UTC) - STALE_AFTER
    )


def _upsert(course_id: int, **values) -> None:
    values["updated_at"] = datetime.now(UTC)
    stmt = insert(Row).values(course_id=course_id, **values)
    stmt = stmt.on_conflict_do_update(index_elements=[Row.course_id], set_=values)
    with engine.begin() as conn:
        conn.execute(stmt)


def try_start(course_id: int) -> bool:
    """Atomicky zabere generování kurzu. False = už běží (v jakémkoliv workeru)."""
    values = dict(
        step=0,
        total=5,
        label="Spouštění generování",
        status="running",
        error=None,
        updated_at=datetime.now(UTC),
    )
    stmt = insert(Row).values(course_id=course_id, **values)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Row.course_id],
        set_=values,
        where=or_(
            Row.status != "running",
            Row.updated_at <= datetime.now(UTC) - STALE_AFTER,
        ),
    ).returning(Row.course_id)
    with engine.begin() as conn:
        return conn.execute(stmt).first() is not None


def set_progress(
    course_id: int,
    step: int,
    label: str,
    total: int = 5,
    status: str = "running",
) -> None:
    _upsert(course_id, step=step, total=total, label=label, status=status, error=None)


def mark_completed(course_id: int) -> None:
    _upsert(course_id, step=5, total=5, label="Dokončeno", status="completed", error=None)


def mark_failed(course_id: int, error: str) -> None:
    # Krok a popisek ponecháme, ať je vidět, kde to spadlo.
    changes = dict(status="failed", error=error, updated_at=datetime.now(UTC))
    stmt = insert(Row).values(course_id=course_id, label="Čekání", **changes)
    stmt = stmt.on_conflict_do_update(index_elements=[Row.course_id], set_=changes)
    with engine.begin() as conn:
        conn.execute(stmt)


def get_progress(course_id: int) -> GenerationProgress | None:
    """None = server o generování neví (žádný záznam, nebo mrtvý ``running``)."""
    with engine.connect() as conn:
        r = conn.execute(select(Row).where(Row.course_id == course_id)).first()
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
        updated_at=r.updated_at,
    )


def register_task(course_id: int, task: asyncio.Task) -> None:
    """Uloží referenci na běžící asyncio task, aby ho GC nezahodil."""
    _running_tasks[course_id] = task


def unregister_task(course_id: int) -> None:
    _running_tasks.pop(course_id, None)


def list_running_course_ids() -> list[int]:
    """Vrátí seznam course_id, pro které právě běží generování."""
    with engine.connect() as conn:
        return list(conn.execute(select(Row.course_id).where(_alive_cond())).scalars())
