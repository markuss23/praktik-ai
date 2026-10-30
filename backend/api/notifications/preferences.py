"""
Uživatelské preference e-mailových notifikací.

Ukládají se jen vypnuté notifikace (tabulka notification_opt_out). Pokud řádek
neexistuje, je notifikace zapnutá.
"""

from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from api import models
from api.enums import NotificationEvent, UserRole

_ALL_ROLES = frozenset(UserRole)
_AUTHORS = frozenset({UserRole.lector, UserRole.guarantor, UserRole.superadmin})
_REVIEWERS = frozenset({UserRole.guarantor, UserRole.superadmin})


@dataclass(frozen=True)
class EventInfo:
    """
    Popis notifikační události pro nastavení v profilu.

    Attributes:
        label: Krátký název události.
        description: Vysvětlení, kdy e-mail přijde.
        roles: Role, kterým se přepínač v profilu zobrazuje.
        locked_for: Role, kterým se přepínač zobrazuje jako zamčený (povinná notifikace).
    """

    label: str
    description: str
    roles: frozenset[UserRole]
    locked_for: frozenset[UserRole] = frozenset()


EVENT_CATALOG: dict[NotificationEvent, EventInfo] = {
    NotificationEvent.course_generated: EventInfo(
        "Kurz vygenerován",
        "Když AI dokončí generování vašeho kurzu.",
        _AUTHORS,
    ),
    NotificationEvent.course_generation_failed: EventInfo(
        "Generování kurzu selhalo",
        "Když se generování vašeho kurzu nezdaří. Superadmini dostávají e-mail i o cizích kurzech.",
        _AUTHORS,
    ),
    NotificationEvent.course_submitted: EventInfo(
        "Kurz čeká na schválení",
        "Když autor odešle kurz ke schválení.",
        _REVIEWERS,
    ),
    NotificationEvent.course_approved: EventInfo(
        "Kurz schválen",
        "Když je váš kurz schválen.",
        _AUTHORS,
    ),
    NotificationEvent.course_rejected: EventInfo(
        "Kurz zamítnut",
        "Když je váš kurz zamítnut.",
        _AUTHORS,
        locked_for=_AUTHORS,
    ),
    NotificationEvent.course_approval_revoked: EventInfo(
        "Zrušeno schválení kurzu",
        "Když je zrušeno schválení kurzu. Jako vlastník kurzu dostanete e-mail vždy, "
        "vypnout jde jen pro kurzy, které jste schválil(a).",
        _AUTHORS,
        locked_for=frozenset({UserRole.lector}),
    ),
    NotificationEvent.course_archived: EventInfo(
        "Kurz archivován",
        "Když je archivován kurz, do kterého jste zapsán(a) a ještě jste ho nedokončil(a).",
        _ALL_ROLES,
    ),
}


def get_disabled_events(db: Session, user_id: int) -> set[str]:
    """
    Vrátí klíče událostí, které má uživatel vypnuté.

    Args:
        db: SQLAlchemy session.
        user_id: ID uživatele.

    Returns:
        Množina event_key. Prázdná množina znamená, že má uživatel vše zapnuté.
    """
    return set(
        db.scalars(
            select(models.NotificationOptOut.event_key).where(
                models.NotificationOptOut.user_id == user_id
            )
        ).all()
    )


def set_event_enabled(db: Session, user_id: int, event: NotificationEvent, enabled: bool) -> None:
    """
    Zapne nebo vypne notifikaci uživatele. Necommituje, commit je na volajícím.

    Args:
        db: SQLAlchemy session.
        user_id: ID uživatele.
        event: Událost, které se nastavení týká.
        enabled: True = zapnout (smaže řádek), False = vypnout (vloží řádek, pokud neexistuje).
    """
    if enabled:
        db.execute(
            delete(models.NotificationOptOut).where(
                models.NotificationOptOut.user_id == user_id,
                models.NotificationOptOut.event_key == event.value,
            )
        )
    else:
        db.execute(
            insert(models.NotificationOptOut)
            .values(user_id=user_id, event_key=event.value)
            .on_conflict_do_nothing(index_elements=["user_id", "event_key"])
        )


def list_preferences(db: Session, user: models.User) -> list[dict]:
    """
    Sestaví přehled notifikací, které se zobrazí v profilu uživatele.

    Obsahuje jen události relevantní pro roli uživatele. Povinné (zamčené)
    notifikace jsou vždy zapnuté bez ohledu na uložená data.

    Args:
        db: SQLAlchemy session.
        user: Přihlášený uživatel.

    Returns:
        Seznam slovníků s klíči event_key, label, description, enabled, mandatory
        (ve tvaru schématu NotificationPreferenceItem).
    """
    disabled = get_disabled_events(db, user.user_id)
    items = []
    for event, info in EVENT_CATALOG.items():
        if user.role not in info.roles:
            continue
        mandatory = user.role in info.locked_for
        items.append(
            {
                "event_key": event,
                "label": info.label,
                "description": info.description,
                "enabled": mandatory or event.value not in disabled,
                "mandatory": mandatory,
            }
        )
    return items


def update_preferences(db: Session, user: models.User, changes: dict[NotificationEvent, bool]) -> None:
    """
    Uloží změny nastavení notifikací uživatele a commitne je.

    Povinné notifikace a události, které pro roli uživatele nejsou relevantní,
    se tiše ignorují.

    Args:
        db: SQLAlchemy session.
        user: Přihlášený uživatel.
        changes: Mapování událost -> zapnuto (True) / vypnuto (False).
    """
    for event, enabled in changes.items():
        info = EVENT_CATALOG.get(event)
        if info is None or user.role not in info.roles or user.role in info.locked_for:
            continue
        set_event_enabled(db, user.user_id, event, enabled)
    db.commit()
