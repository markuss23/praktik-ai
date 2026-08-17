from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import TicketStatus, UserRole
from api.src.tickets.resolvers import RESOLVERS, get_allowed_categories, get_resolver
from api.src.tickets.schemas import (
    TicketCategoriesResponse,
    TicketCreate,
    TicketItem,
    TicketMessageCreate,
    TicketMessageItem,
)


def get_ticket_categories() -> list[TicketCategoriesResponse]:
    """Pro každý entity_type vrátí jeho povolené category — ať si FE podle
    zvoleného entity_type dokáže sestavit nabídku kategorií bez hádání."""
    return [
        TicketCategoriesResponse(
            entity_type=entity_type,
            allowed_categories=sorted(get_allowed_categories(entity_type)),
        )
        for entity_type in RESOLVERS
    ]


def _is_staff(db: Session, actor: models.User, ticket: models.Ticket) -> bool:
    """Staff smí odpovídat na ticket a uzavřít ho — delegováno na resolver
    daného entity_type (general má vlastní GeneralTicketResolver)."""
    resolver = get_resolver(ticket.entity_type)
    entity = resolver.load_entity(db, ticket.entity_id)
    return resolver.is_staff_for(actor, entity)


def get_tickets(
    db: Session,
    actor: models.User,
    course_id: int | None = None,
) -> list[TicketItem]:
    """Vrátí tickety. Student vidí jen své, staff role vidí všechny
    (volitelně omezené na jeden kurz přes course_id)."""
    stm = (
        select(models.Ticket)
        .where(models.Ticket.is_active.is_(True))
        .order_by(models.Ticket.created_at.desc())
    )

    if course_id is not None:
        stm = stm.where(models.Ticket.course_id == course_id)

    # Student vidí jen své tickety, staff role vidí všechny
    if actor.role == UserRole.user:
        stm = stm.where(models.Ticket.requester_id == actor.user_id)

    tickets = db.scalars(stm).all()
    return [TicketItem.model_validate(t) for t in tickets]


def get_ticket(db, ticket_id: int, actor: models.User) -> TicketItem:
    """Vrátí ticket podle id. Student vidí jen své, staff role vidí všechny."""
    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")

    is_requester = ticket.requester_id == actor.user_id
    is_staff = _is_staff(db, actor, ticket)

    if not is_requester and not is_staff:
        raise HTTPException(status_code=403, detail="Nemáte přístup k tomuto ticketu")

    stm = (
        select(models.Ticket)
        .where(models.Ticket.ticket_id == ticket_id, models.Ticket.is_active.is_(True))
        .order_by(models.Ticket.created_at.desc())
    )

    ticket = db.scalar(stm)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket nenalezen")
    return TicketItem.model_validate(ticket)


def create_ticket(
    db: Session,
    data: TicketCreate,
    actor: models.User,
) -> TicketItem:
    """Vytvoří ticket. Ověření práv a dopočet course_id deleguje na resolver
    daného entity_type (general má vlastní GeneralTicketResolver bez omezení)."""
    resolver = get_resolver(data.entity_type)
    entity = resolver.load_entity(db, data.entity_id)
    resolver.authorize_create(db, actor, entity)
    course_id = resolver.get_course_id(entity)

    ticket = models.Ticket(
        requester_id=actor.user_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        course_id=course_id,
        category=data.category,
        title=data.title,
        status=TicketStatus.open,
    )
    db.add(ticket)
    db.flush()

    db.add(
        models.TicketMessage(
            ticket_id=ticket.ticket_id,
            author_id=actor.user_id,
            body=data.message,
        )
    )
    db.commit()
    db.refresh(ticket)
    return TicketItem.model_validate(ticket)


def get_ticket_messages(
    db: Session,
    ticket_id: int,
    actor: models.User,
) -> list[TicketMessageItem]:
    """Vrátí vlákno zpráv ticketu. Requester nevidí interní poznámky staffu."""
    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")

    is_requester = ticket.requester_id == actor.user_id
    is_staff = _is_staff(db, actor, ticket)
    if not is_requester and not is_staff:
        raise HTTPException(status_code=403, detail="Nemáte přístup k tomuto ticketu")

    stm = (
        select(models.TicketMessage)
        .where(
            models.TicketMessage.ticket_id == ticket_id,
            models.TicketMessage.is_active.is_(True),
        )
        .order_by(models.TicketMessage.created_at)
    )
    if not is_staff:
        stm = stm.where(models.TicketMessage.is_internal.is_(False))

    messages = db.scalars(stm).all()
    return [TicketMessageItem.model_validate(m) for m in messages]


def claim_ticket(
    db: Session,
    ticket_id: int,
    actor: models.User,
) -> TicketItem:
    """Staff si přiřadí otevřený ticket a začne ho řešit se studentem.
    Jde jen z open — vyřešený/uzavřený ticket se znovu nepřiřazuje, jen se
    může vrátit do in_progress přes add_ticket_message (viz níže)."""
    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")

    if not _is_staff(db, actor, ticket):
        raise HTTPException(status_code=403, detail="Ticket může přiřadit jen staff")

    if ticket.status != TicketStatus.open:
        raise HTTPException(
            status_code=409, detail="Ticket lze přiřadit jen ve stavu open"
        )

    ticket.assignee_id = actor.user_id
    ticket.status = TicketStatus.in_progress
    db.commit()
    db.refresh(ticket)
    return TicketItem.model_validate(ticket)


def add_ticket_message(
    db: Session,
    ticket_id: int,
    data: TicketMessageCreate,
    actor: models.User,
) -> TicketMessageItem:
    """Přidá zprávu do vlákna. Zpráva sama o sobě stav nemění — o tom, kdy je
    ticket vyřešen, rozhoduje staff explicitně přes update_ticket_status.
    """
    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")

    is_requester = ticket.requester_id == actor.user_id
    is_staff = _is_staff(db, actor, ticket)
    if not is_requester and not is_staff:
        raise HTTPException(status_code=403, detail="Nemáte přístup k tomuto ticketu")

    if ticket.status == TicketStatus.closed:
        raise HTTPException(status_code=409, detail="Ticket je uzavřen")

    if data.is_internal and not is_staff:
        raise HTTPException(
            status_code=403, detail="Interní poznámku může přidat jen staff"
        )

    # ticket byl z pohledu staff vyřešený, ale student na něj reaguje — znovu se otevře
    if ticket.status == TicketStatus.resolved:
        ticket.status = TicketStatus.in_progress

    message = models.TicketMessage(
        ticket_id=ticket.ticket_id,
        author_id=actor.user_id,
        body=data.body,
        is_internal=data.is_internal,
    )
    db.add(message)

    db.commit()
    db.refresh(message)
    return TicketMessageItem.model_validate(message)


def update_ticket_status(
    db: Session,
    ticket_id: int,
    status: TicketStatus,
    actor: models.User,
) -> TicketItem:
    """Ruční změna stavu. Jediné povolené cíle jsou resolved (jen staff) a
    closed (requester i staff) — ostatní stavy (open/in_progress/pending)
    vznikají jen z create_ticket/claim_ticket/automatického znovuotevření
    v add_ticket_message, ne ruční volbou requestera."""

    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")

    is_requester = ticket.requester_id == actor.user_id
    is_staff = _is_staff(db, actor, ticket)
    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")

    if not is_requester and not is_staff:
        raise HTTPException(status_code=403, detail="Nemáte přístup k tomuto ticketu")

    if status == TicketStatus.resolved:
        if not is_staff:
            raise HTTPException(status_code=403, detail="Vyřešit ticket může jen staff")
    elif status == TicketStatus.closed:
        if not ticket.status == TicketStatus.resolved:
            raise HTTPException(
                status_code=400, detail="Ticket může být uzavřen jen v stavu resolved"
            )
    else:
        raise HTTPException(
            status_code=400, detail=f"Stav '{status}' nelze nastavit ručně"
        )

    ticket.status = status
    db.commit()
    db.refresh(ticket)
    return TicketItem.model_validate(ticket)


def delete_ticket(
    db: Session,
    ticket_id: int,
    actor: models.User,
) -> None:
    """Smazat ticket. Requester jen dokud je open (bez odpovědi), superadmin vždy."""
    ticket = get_or_404(db, models.Ticket, ticket_id, detail="Ticket nenalezen")
    resolver = get_resolver(ticket.entity_type)
    entity = resolver.load_entity(db, ticket.entity_id)

    if resolver.is_staff_for(actor, entity):
        pass
    elif ticket.requester_id == actor.user_id:
        if ticket.status != TicketStatus.open:
            raise HTTPException(
                status_code=403,
                detail="Ticket s odpovědí nelze smazat",
            )
    else:
        raise HTTPException(status_code=403, detail="Nedostatečná oprávnění")

    ticket.soft_delete()
    db.commit()
