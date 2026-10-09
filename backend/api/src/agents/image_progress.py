"""In-memory tracker pro průběh generování obrázků (cover kurzu, obrázek modulu).

Záměrně oddělený od ``progress.py`` (průběh generování kurzu), aby se do něj
nezasahovalo: na něm závisí víc generací a frontend. Princip je stejný - stav je
procesově-lokální a při restartu služby se ztrácí.

Jeden tracker obsluhuje kurzy i moduly; záznamy jsou klíčované řetězcem
``"course:<id>"`` / ``"module:<id>"`` (viz ``progress_key``).

Kroky generování (total = 4):
    1. načtení kontextu z DB
    2. sestavení image promptu (LLM)
    3. generování obrázku (image model)
    4. uložení do SeaweedFS
"""

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Lock

IMAGE_GENERATION_TOTAL_STEPS = 4


@dataclass
class ImageGenerationProgress:
    step: int = 0
    total: int = IMAGE_GENERATION_TOTAL_STEPS
    label: str = "Čekání"
    status: str = "pending"  # pending | running | completed | failed
    error: str | None = None
    # Výsledek po dokončení (serializovaný GenerateImageResponse)
    result: dict | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


_progress: dict[str, ImageGenerationProgress] = {}
_running_tasks: dict[str, asyncio.Task] = {}
_lock = Lock()


def progress_key(kind: str, entity_id: int) -> str:
    """Sestaví klíč trackeru pro kurz nebo modul.

    Args:
        kind: "course" nebo "module".
        entity_id: course_id, resp. module_id.
    """
    return f"{kind}:{entity_id}"


def set_image_progress(
    key: str | None,
    step: int,
    label: str,
    status: str = "running",
) -> None:
    """Zapíše aktuální krok generování.

    Args:
        key: Klíč z ``progress_key``; při None (běh mimo background task) se nic nezapíše.
        step: Číslo kroku 1–4.
        label: Popis kroku pro UI.
        status: Stav běhu, výchozí "running".
    """
    if key is None:
        return
    with _lock:
        _progress[key] = ImageGenerationProgress(
            step=step,
            label=label,
            status=status,
            updated_at=datetime.now(UTC),
        )


def mark_image_completed(key: str, result: dict) -> None:
    """Označí generování jako dokončené a uloží výsledek pro progress endpoint.

    Args:
        key: Klíč z ``progress_key``.
        result: Serializovaný GenerateImageResponse (cesta v SeaweedFS, model, prompt…).
    """
    with _lock:
        _progress[key] = ImageGenerationProgress(
            step=IMAGE_GENERATION_TOTAL_STEPS,
            label="Dokončeno",
            status="completed",
            result=result,
            updated_at=datetime.now(UTC),
        )


def mark_image_failed(key: str, error: str) -> None:
    """Označí generování jako neúspěšné a uloží chybovou zprávu.

    Args:
        key: Klíč z ``progress_key``.
        error: Text chyby pro UI.
    """
    with _lock:
        entry = _progress.get(key) or ImageGenerationProgress()
        entry.status = "failed"
        entry.error = error
        entry.updated_at = datetime.now(UTC)
        _progress[key] = entry


def get_image_progress(key: str) -> ImageGenerationProgress | None:
    """Vrátí průběh pro daný klíč, nebo None, pokud generování nikdy neběželo."""
    with _lock:
        return _progress.get(key)


def register_image_task(key: str, task: asyncio.Task) -> None:
    """Uloží referenci na běžící asyncio task, aby ho GC nezahodil."""
    with _lock:
        _running_tasks[key] = task


def unregister_image_task(key: str) -> None:
    with _lock:
        _running_tasks.pop(key, None)


def is_image_running(key: str) -> bool:
    """Vrátí True, pokud pro daný klíč aktuálně běží generační task."""
    with _lock:
        task = _running_tasks.get(key)
        return task is not None and not task.done()


def list_running_image_ids() -> list[str]:
    """Vrátí seznam klíčů, pro které právě běží generační task."""
    with _lock:
        return [key for key, task in _running_tasks.items() if not task.done()]
