from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.tickets.schemas import (
    TicketCategoriesResponse,
    TicketItem,
    TicketMessageItem,
    TicketCreate,
    TicketMessageCreate,
    TicketStatusUpdate,
)
from api.src.tickets.controllers import (
    get_ticket,
    get_ticket_categories,
    get_tickets,
    create_ticket,
    get_ticket_messages,
    add_ticket_message,
    claim_ticket,
    update_ticket_status,
    delete_ticket,
)

router = APIRouter(prefix="/tickets", tags=["Tickets"])

public_router = APIRouter(prefix="/tickets", tags=["Tickets"])


# Musí být před GET /{ticket_id} na hlavním routeru — jinak by "categories"
# FastAPI zkusil převést na int jako ticket_id a spadlo by to na 422.
@public_router.get("/categories", operation_id="get_ticket_categories")
def endp_get_ticket_categories() -> list[TicketCategoriesResponse]:
    """Pro každý entity_type vrátí jeho povolené category — pro sestavení FE formuláře."""
    return get_ticket_categories()


@router.get("", operation_id="list_tickets", dependencies=[require_role("user")])
def endp_list_tickets(
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
    course_id: int | None = None,
) -> list[TicketItem]:
    """Vrátí vytvořené tickety. Pokud je zadán course_id, vrátí jen tickety k danému kurzu."""
    return get_tickets(db, actor=actor, course_id=course_id)


@router.get(
    "/{ticket_id}", operation_id="get_ticket", dependencies=[require_role("user")]
)
def endp_get_ticket(
    db: SessionSqlSessionDependency,
    ticket_id: int,
    actor: CurrentUser,
) -> TicketItem:
    """Vrátí ticket podle id."""
    return get_ticket(db, ticket_id=ticket_id, actor=actor)


@router.get(
    "/{ticket_id}/messages",
    operation_id="list_ticket_messages",
    dependencies=[require_role("user")],
)
def endp_list_ticket_messages(
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
    ticket_id: int,
) -> list[TicketMessageItem]:
    """Vrátí zprávy k danému tiketu."""
    return get_ticket_messages(db, actor=actor, ticket_id=ticket_id)


@router.post("", operation_id="create_ticket", dependencies=[require_role("user")])
def endp_create_ticket(
    db: SessionSqlSessionDependency,
    data: TicketCreate,
    actor: CurrentUser,
) -> TicketItem:
    """Vytvoří ticket.
    entiti_type - typ entity, ke které se ticket váže
    entity_id - id entity, ke které se ticket váže
    category - kategorie ticketu
    """
    return create_ticket(db, data=data, actor=actor)


@router.post(
    "/{ticket_id}/messages",
    operation_id="add_ticket_message",
    dependencies=[require_role("user")],
)
def endp_add_ticket_message(
    db: SessionSqlSessionDependency,
    ticket_id: int,
    data: TicketMessageCreate,
    actor: CurrentUser,
) -> TicketMessageItem:
    """Přidá zprávu k ticketu."""
    return add_ticket_message(db, ticket_id=ticket_id, data=data, actor=actor)


@router.post(
    "/{ticket_id}/claim",
    operation_id="claim_ticket",
    dependencies=[require_role("user")],
)
def endp_claim_ticket(
    db: SessionSqlSessionDependency,
    ticket_id: int,
    actor: CurrentUser,
) -> TicketItem:
    """Staff si přiřadí otevřený ticket a začne ho řešit se studentem."""
    return claim_ticket(db, ticket_id=ticket_id, actor=actor)


@router.put(
    "/{ticket_id}",
    operation_id="update_ticket_status",
    dependencies=[require_role("user")],
)
def endp_update_ticket_status(
    db: SessionSqlSessionDependency,
    ticket_id: int,
    data: TicketStatusUpdate,
    actor: CurrentUser,
) -> TicketItem:
    """Aktualizuje status ticketu."""
    return update_ticket_status(
        db, ticket_id=ticket_id, status=data.status, actor=actor
    )


@router.delete(
    "/{ticket_id}", operation_id="delete_ticket", dependencies=[require_role("user")]
)
def endp_delete_ticket(
    db: SessionSqlSessionDependency,
    ticket_id: int,
    actor: CurrentUser,
) -> None:
    """Smaže ticket. Smí jen staff (autor kurzu, garant, superadmin)."""
    return delete_ticket(db, ticket_id=ticket_id, actor=actor)
