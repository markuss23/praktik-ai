from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.module_tickets.schemas import TicketCreate, TicketItem, TicketReply
from api.src.module_tickets.controllers import (
    get_tickets,
    create_ticket,
    reply_to_ticket,
    delete_ticket,
)

router = APIRouter(prefix="/module-tickets", tags=["Module Tickets"])


@router.get(
    "", operation_id="list_module_tickets", dependencies=[require_role("user")]
)
def endp_list_module_tickets(
    course_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> list[TicketItem]:
    """Vrátí tickety kurzu."""
    return get_tickets(db, course_id=course_id, actor=actor)


@router.post(
    "", operation_id="create_module_ticket", dependencies=[require_role("user")]
)
def endp_create_module_ticket(
    data: TicketCreate,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> TicketItem:
    """Vytvoří nový ticket. Student musí být zapsán v kurzu."""
    return create_ticket(db, data=data, actor=actor)


@router.put(
    "/{ticket_id}/reply",
    operation_id="reply_to_module_ticket",
    dependencies=[require_role("lector")],
)
def endp_reply_to_module_ticket(
    ticket_id: int,
    body: TicketReply,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> TicketItem:
    """Odpovědět na ticket. Může autor kurzu, garant nebo superadmin."""
    return reply_to_ticket(db, ticket_id=ticket_id, reply_text=body.reply, actor=actor)


@router.delete(
    "/{ticket_id}",
    operation_id="delete_module_ticket",
    status_code=204,
    dependencies=[require_role("user")],
)
def endp_delete_module_ticket(
    ticket_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> None:
    """Smazat ticket. Student jen bez reply, superadmin vždy."""
    delete_ticket(db, ticket_id=ticket_id, actor=actor)
