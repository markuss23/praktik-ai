"""
Log odeslaných e-mailů (tabulka email_log).

Každý pokus o odeslání se zapíše jako jeden řádek, včetně neúspěšných
a přeskočených. Uživatel na profilu vidí jen svoje záznamy.
"""

import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.enums import NotificationEvent
from api.notifications.email import SendResult
from api.notifications.preferences import EVENT_CATALOG

logger = logging.getLogger(__name__)


def log_email(
    db: Session,
    user: models.User,
    course_id: int | None,
    event: NotificationEvent,
    subject: str,
    body: str,
    result: SendResult,
) -> None:
    """
    Uloží záznam o pokusu o odeslání e-mailu a hned ho commitne.

    Commit po každém záznamu zajistí, že selhání u dalšího příjemce nesmaže
    záznamy předchozích. Chyba zápisu se jen zaloguje a neprobublává, aby
    log nikdy nezastavil odesílání notifikací.

    """
    try:
        db.add(
            models.EmailLog(
                user_id=user.user_id,
                course_id=course_id,
                event_key=event.value,
                recipient_email=user.email,
                subject=subject[:255],
                body=body,
                status=result.status,
                error=result.error,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Nepodařilo se zapsat e-mail log (uživatel %s, událost %s)", user.user_id, event
        )


def list_user_email_log(
    db: Session, user_id: int, limit: int, offset: int
) -> tuple[list[models.EmailLog], int]:
    """
    Načte stránku historie e-mailů uživatele, nejnovější první.

    Args:
        db: SQLAlchemy session.
        user_id: ID uživatele, jehož e-maily se načítají.
        limit: Maximální počet vrácených záznamů.
        offset: Počet záznamů, které se přeskočí (stránkování).

    Returns:
        Dvojice (záznamy na stránce, celkový počet záznamů uživatele).
    """
    total = db.scalar(
        select(func.count()).select_from(models.EmailLog).where(models.EmailLog.user_id == user_id)
    ) or 0
    items = list(
        db.scalars(
            select(models.EmailLog)
            .options(joinedload(models.EmailLog.course))
            .where(models.EmailLog.user_id == user_id)
            .order_by(models.EmailLog.created_at.desc(), models.EmailLog.log_id.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
    return items, total


def event_label(event_key: str) -> str:
    """
    Vrátí čitelný název události pro zobrazení v historii e-mailů.

    Args:
        event_key: Klíč události uložený v email_log.

    Returns:
        Název z EVENT_CATALOG, nebo samotný klíč, pokud událost v katalogu není.
    """
    try:
        return EVENT_CATALOG[NotificationEvent(event_key)].label
    except (ValueError, KeyError):
        return event_key
