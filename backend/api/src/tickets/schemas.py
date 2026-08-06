from datetime import datetime

from pydantic import BaseModel, Field

from api.enums import TicketEntityType, TicketStatus, TicketType
from api.src.common.schemas import ORMModel


class TicketCreate(BaseModel):
    entity_type: TicketEntityType
    entity_id: int
    category: TicketType
    title: str = Field(..., max_length=255)
    message: str = Field(..., min_length=1)


class TicketMessageCreate(BaseModel):
    body: str = Field(..., min_length=1)
    is_internal: bool = False


class TicketMessageItem(ORMModel):
    message_id: int
    ticket_id: int
    author_id: int
    body: str
    is_internal: bool
    created_at: datetime


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


class TicketItem(ORMModel):
    ticket_id: int
    requester_id: int
    assignee_id: int | None
    entity_type: TicketEntityType | None
    entity_id: int | None
    course_id: int | None
    category: TicketType
    title: str
    status: TicketStatus
    created_at: datetime
