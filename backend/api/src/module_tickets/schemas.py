from datetime import datetime

from pydantic import BaseModel, Field

from api.enums import TicketStatus, TicketType
from api.src.common.schemas import ORMModel


class TicketCreate(BaseModel):
    module_id: int
    ticket_type: TicketType
    title: str = Field(..., max_length=255)
    reason: str


class TicketReply(BaseModel):
    reply: str


class TicketItem(ORMModel):
    ticket_id: int
    user_id: int
    module_id: int
    course_id: int
    ticket_type: TicketType
    title: str
    reason: str
    reply: str | None
    status: TicketStatus
    created_at: datetime
