"""In-memory tracker pro průběh AI generování kurzu.

Stav je procesově-lokální (vhodné pro single-instance deployment).
Při restartu služby se průběh ztrácí — to je v pořádku, protože
samotná generace také neběží dál.

Sleduje také odkazy na běžící asyncio tasky, aby je sběrač paměti
nezahodil a aby šlo zjistit, jestli pro daný kurz už generace běží
(důležité při refreshi stránky uprostřed generování).
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock


@dataclass
class GenerationProgress:
    step: int = 0
    total: int = 5
    label: str = "Čekání"
    status: str = "pending"  # pending | running | completed | failed
    error: str | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_progress: dict[int, GenerationProgress] = {}
_running_tasks: dict[int, asyncio.Task] = {}
_lock = Lock()


def set_progress(
    course_id: int,
    step: int,
    label: str,
    total: int = 5,
    status: str = "running",
) -> None:
    with _lock:
        _progress[course_id] = GenerationProgress(
            step=step,
            total=total,
            label=label,
            status=status,
            updated_at=datetime.now(timezone.utc),
        )


def mark_completed(course_id: int) -> None:
    with _lock:
        entry = _progress.get(course_id)
        if entry is None:
            entry = GenerationProgress(step=5, total=5)
            _progress[course_id] = entry
        entry.step = entry.total
        entry.label = "Dokončeno"
        entry.status = "completed"
        entry.error = None
        entry.updated_at = datetime.now(timezone.utc)


def mark_failed(course_id: int, error: str) -> None:
    with _lock:
        entry = _progress.get(course_id) or GenerationProgress()
        entry.status = "failed"
        entry.error = error
        entry.updated_at = datetime.now(timezone.utc)
        _progress[course_id] = entry


def get_progress(course_id: int) -> GenerationProgress | None:
    with _lock:
        return _progress.get(course_id)


def clear_progress(course_id: int) -> None:
    with _lock:
        _progress.pop(course_id, None)


def register_task(course_id: int, task: asyncio.Task) -> None:
    """Uloží referenci na běžící asyncio task, aby ho GC nezahodil."""
    with _lock:
        _running_tasks[course_id] = task


def unregister_task(course_id: int) -> None:
    with _lock:
        _running_tasks.pop(course_id, None)


def is_running(course_id: int) -> bool:
    """Vrátí True, pokud pro daný kurz aktuálně běží generační task."""
    with _lock:
        task = _running_tasks.get(course_id)
        return task is not None and not task.done()


def list_running_course_ids() -> list[int]:
    """Vrátí seznam course_id, pro které právě běží generační task."""
    with _lock:
        return [cid for cid, task in _running_tasks.items() if not task.done()]
