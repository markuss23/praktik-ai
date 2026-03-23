from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import TicketStatus, UserRole
from api.src.module_tickets.schemas import TicketCreate, TicketItem


def _check_enrollment(db: Session, user_id: int, course_id: int) -> None:
    enrollment = db.scalar(
        select(models.Enrollment).where(
            models.Enrollment.user_id == user_id,
            models.Enrollment.course_id == course_id,
            models.Enrollment.is_active.is_(True),
        )
    )
    if enrollment is None:
        raise HTTPException(status_code=403, detail="Nejste zapsáni v tomto kurzu")


def get_tickets(
    db: Session,
    course_id: int,
    actor: models.User,
) -> list[TicketItem]:
    """Vrátí tickety kurzu. Student vidí jen své, autor/garant/superadmin vidí všechny."""
    stm = (
        select(models.ModuleTicket)
        .where(
            models.ModuleTicket.course_id == course_id,
            models.ModuleTicket.is_active.is_(True),
        )
        .order_by(models.ModuleTicket.created_at.desc())
    )

    if actor.role == UserRole.user:
        stm = stm.where(models.ModuleTicket.user_id == actor.user_id)

    tickets = db.scalars(stm).all()
    return [TicketItem.model_validate(t) for t in tickets]


def create_ticket(
    db: Session,
    data: TicketCreate,
    actor: models.User,
) -> TicketItem:
    """Vytvoří ticket. Student musí být zapsán v kurzu."""
    module = get_or_404(db, models.Module, data.module_id, detail="Modul nenalezen")

    _check_enrollment(db, actor.user_id, module.course_id)

    ticket = models.ModuleTicket(
        user_id=actor.user_id,
        module_id=data.module_id,
        course_id=module.course_id,
        ticket_type=data.ticket_type,
        title=data.title,
        reason=data.reason,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return TicketItem.model_validate(ticket)


def reply_to_ticket(
    db: Session,
    ticket_id: int,
    reply_text: str,
    actor: models.User,
) -> TicketItem:
    """Odpovědět na ticket. Může autor kurzu, garant nebo superadmin."""
    ticket = get_or_404(db, models.ModuleTicket, ticket_id, detail="Ticket nenalezen")

    is_course_owner = ticket.course.owner_id == actor.user_id
    is_privileged = actor.role in (UserRole.guarantor, UserRole.superadmin)

    if not is_course_owner and not is_privileged:
        raise HTTPException(
            status_code=403,
            detail="Na ticket může odpovědět pouze autor kurzu, garant nebo superadmin",
        )

    if ticket.user_id == actor.user_id:
        raise HTTPException(
            status_code=403,
            detail="Nelze odpovědět na vlastní ticket",
        )

    if ticket.reply is not None:
        raise HTTPException(
            status_code=409, detail="Na tento ticket již byla přidána odpověď"
        )

    if not reply_text.strip():
        raise HTTPException(
            status_code=422, detail="Text odpovědi nesmí být prázdný"
        )

    ticket.reply = reply_text
    ticket.status = TicketStatus.resolved
    db.commit()
    db.refresh(ticket)
    return TicketItem.model_validate(ticket)


def delete_ticket(
    db: Session,
    ticket_id: int,
    actor: models.User,
) -> None:
    """Smazat ticket. Student jen bez reply, superadmin vždy."""
    ticket = get_or_404(db, models.ModuleTicket, ticket_id, detail="Ticket nenalezen")

    if actor.role == UserRole.superadmin:
        pass
    elif ticket.user_id == actor.user_id:
        if ticket.reply is not None:
            raise HTTPException(
                status_code=403,
                detail="Ticket s odpovědí nelze smazat",
            )
    else:
        raise HTTPException(status_code=403, detail="Nedostatečná oprávnění")

    ticket.is_active = False
    db.commit()
