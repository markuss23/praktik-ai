"""
E-mailové notifikace o událostech kurzu (E1–E7).

Katalog událostí a příjemců:
    
    Kdy zasílat notifikace          Příjemci
    
    E1 kurz vygenerován           -> vlastník
    E2 generování selhalo         -> vlastník + aktivní superadmini (diagnostika)
    E3 kurz odeslán ke schválení  -> aktivní garanti a superadmini, kromě vlastníka
    E4 kurz schválen              -> vlastník
    E5 kurz zamítnut              -> vlastník (povinná, nejde vypnout)
    E6 zrušeno schválení          -> vlastník (povinná) + původní schvalovatel, pokud je
                                     stále aktivní garant/superadmin
    E7 kurz archivován            -> zapsaní studenti, kteří kurz nedokončili
"""

import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.config import settings
from api.database import SessionLocal
from api.enums import NotificationEvent, Status, UserRole
from api.notifications.email import send_email
from api.notifications.templates import Audience, render_email

logger = logging.getLogger(__name__)

_REVIEWER_ROLES = (UserRole.guarantor, UserRole.superadmin)


@dataclass(frozen=True)
class Recipient:
    """
    Příjemce notifikace.

    Attributes:
        user: Uživatel, kterému se e-mail pošle.
        audience: Vztah ke kurzu, určuje text e-mailu a odkaz.
        mandatory: True = notifikaci nelze vypnout, preference se ignorují.
    """

    user: models.User
    audience: Audience
    mandatory: bool = False


def classify_transition(old: Status, new: Status) -> NotificationEvent | None:
    """
    Vrátí notifikační událost podle změny stavu kurzu, nebo None, pokud se o přechodu nenotifikuje

    Args:
        old: Stav kurzu před změnou.
        new: Stav kurzu po změně.

    """
    if new == Status.in_review:
        return NotificationEvent.course_submitted
    if old == Status.in_review and new == Status.approved:
        return NotificationEvent.course_approved
    if old == Status.in_review and new == Status.edited:
        return NotificationEvent.course_rejected
    if old == Status.approved and new == Status.edited:
        return NotificationEvent.course_approval_revoked
    if new == Status.archived:
        return NotificationEvent.course_archived
    return None


def _active_users_with_roles(db: Session, roles: tuple[UserRole, ...]) -> list[models.User]:
    """
    Načte aktivní uživatele z daných rolí.

    Args:
        db: Otevřená SQLAlchemy session.
        roles: Role, které má uživatel mít.

    """
    return list(
        db.scalars(
            select(models.User)
            .where(models.User.role.in_(roles), models.User.is_active.is_(True))
            .order_by(models.User.user_id)
        ).all()
    )


def _unfinished_students(db: Session, course_id: int) -> list[models.User]:
    """
    Načte aktivní uživatele zapsané do kurzu, kteří ho nedokončili ani neopustili.

    Args:
        db: Otevřená SQLAlchemy session.
        course_id: ID kurzu.

    """
    return list(
        db.scalars(
            select(models.User)
            .join(models.Enrollment, models.Enrollment.user_id == models.User.user_id)
            .where(
                models.Enrollment.course_id == course_id,
                models.Enrollment.is_active.is_(True),
                models.Enrollment.completed_at.is_(None),
                models.Enrollment.left_at.is_(None),
                models.User.is_active.is_(True),
            )
            .order_by(models.User.user_id)
        ).all()
    )


def _candidates(
    db: Session,
    event: NotificationEvent,
    course: models.Course,
    previous_approver_id: int | None,
) -> list[Recipient]:
    """
    Vybere aktivní uživatele kteří by měli dostat e-mail, včetně autora změny a duplicit.

    Vlastník je vždy první, aby při deduplikaci vyhrála jeho varianta e-mailu.

    Args:
        db: Otevřená SQLAlchemy session.
        event: Událost kurzu.
        course: Kurz po změně stavu.
        previous_approver_id: Schvalovatel kurzu před změnou (jen pro E6).

    """
    owner = course.owner
    match event:
        case NotificationEvent.course_generated | NotificationEvent.course_approved:
            return [Recipient(owner, "owner")]
        case NotificationEvent.course_generation_failed:
            return [Recipient(owner, "owner")] + [
                Recipient(u, "superadmin")
                for u in _active_users_with_roles(db, (UserRole.superadmin,))
            ]
        case NotificationEvent.course_submitted:
            return [
                Recipient(u, "reviewer")
                for u in _active_users_with_roles(db, _REVIEWER_ROLES)
                if u.user_id != course.owner_id
            ]
        case NotificationEvent.course_rejected:
            return [Recipient(owner, "owner", mandatory=True)]
        case NotificationEvent.course_approval_revoked:
            recipients = [Recipient(owner, "owner", mandatory=True)]
            # Původní schvalovatel, pokud je stále aktivní garant/superadmin
            approver = db.get(models.User, previous_approver_id) if previous_approver_id else None
            if approver is not None and approver.role in _REVIEWER_ROLES:
                recipients.append(Recipient(approver, "approver"))
            return recipients
        case NotificationEvent.course_archived:
            return [Recipient(u, "student") for u in _unfinished_students(db, course.course_id)]
    return []


def resolve_recipients(
    db: Session,
    event: NotificationEvent,
    course: models.Course,
    actor_id: int | None,
    previous_approver_id: int | None = None,
) -> list[Recipient]:
    """
    Vybere příjemce e-mailu o události kurzu.

    Postup vybírání příjemců: 
        vybrat uživatele kteří by měli dostat e-mail -> odebrat naktivní uživatele -> bez autora změny
    -> odebrat duplicity -> odebrání uživatelů, kteří mají událost vypnutou
    (kromě povinných notifikací).

    Args:
        db: Otevřená SQLAlchemy session.
        event: Událost kurzu.
        course: Kurz po změně stavu.
        actor_id: ID uživatele, který změnu provedl.
        previous_approver_id: Schvalovatel kurzu před změnou.

    Returns:
        Seznam příjemců.
    """
    seen: set[int] = set()
    recipients: list[Recipient] = []
    for r in _candidates(db, event, course, previous_approver_id):
        if r.user is None or not r.user.is_active or r.user.user_id == actor_id:
            continue
        if r.user.user_id in seen:
            continue
        seen.add(r.user.user_id)
        recipients.append(r)

    optional_ids = [r.user.user_id for r in recipients if not r.mandatory]
    if not optional_ids:
        return recipients

    opted_out = set(
        db.scalars(
            select(models.NotificationOptOut.user_id).where(
                models.NotificationOptOut.event_key == event.value,
                models.NotificationOptOut.user_id.in_(optional_ids),
            )
        ).all()
    )
    return [r for r in recipients if r.mandatory or r.user.user_id not in opted_out]


def build_url(audience: Audience, course_id: int) -> str:
    """
    Sestaví odkaz do frontendu, kam e-mail příjemce nasměruje.

    Args:
        audience: Vztah příjemce ke kurzu.
        course_id: ID kurzu.

    Returns:
        Absolutní URL: garant -> stránka schválení, student -> Moje kurzy,
        ostatní -> obsah kurzu v administraci.
    """
    base = settings.smtp.frontend_url.rstrip("/")
    if audience == "reviewer":
        return f"{base}/admin/review/{course_id}"
    if audience == "student":
        return f"{base}/moje-kurzy"
    return f"{base}/admin?view=course-content&courseId={course_id}"


def _user_label(user: models.User | None) -> str:
    """
    Vrátí jméno uživatele pro text e-mailu.

    Args:
        user: Uživatel, nebo None (změnu provedl systém).

    Returns:
        display_name, případně e-mail, nebo "systém", pokud uživatel chybí.
    """
    if user is None:
        return "systém"
    return user.display_name or user.email


def notify_course_event(
    course_id: int,
    event: NotificationEvent,
    actor_id: int | None = None,
    previous_approver_id: int | None = None,
) -> None:
    """
    Background task: rozešle e-mail o události kurzu každému příjemci zvlášť.

    Otevírá si vlastní DB session, protože session z requestu je v době běhu
    tasku již zavřená. Selhání u jednoho příjemce nebrání odeslání ostatním.
    Výjimky neprobublávají, vše se pouze loguje.

    Args:
        course_id: ID kurzu.
        event: Událost kurzu .
        actor_id: ID uživatele, který změnu provedl. None = systém (E1, E2).
        previous_approver_id: Schvalovatel kurzu zachycený před změnou stavu (pro E6).
    """
    db = SessionLocal()
    try:
        course = db.get(models.Course, course_id)
        if course is None:
            return

        recipients = resolve_recipients(db, event, course, actor_id, previous_approver_id)
        if not recipients:
            return

        actor = db.get(models.User, actor_id) if actor_id is not None else None
        base_context = {
            "title": course.title,
            "course_id": str(course_id),
            "actor": _user_label(actor),
            "owner": _user_label(course.owner),
            "profile_url": f"{settings.smtp.frontend_url.rstrip('/')}/profil",
        }

        for r in recipients:
            context = {**base_context, "url": build_url(r.audience, course_id)}
            subject, body = render_email(event, r.audience, context, r.mandatory)
            if not send_email(r.user.email, subject, body):
                logger.warning(
                    "Notifikace %s pro uživatele %s (kurz %s) nebyla odeslána",
                    event, r.user.user_id, course_id,
                )
    except Exception:
        logger.exception("Chyba při odesílání notifikace %s o kurzu %s", event, course_id)
    finally:
        db.close()
