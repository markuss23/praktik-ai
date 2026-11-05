from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from api.enums import TicketEntityType, TicketStatus, TicketType
from api.src.common.schemas import ORMModel
from api.src.tickets.resolvers import get_allowed_categories


class TicketCreate(BaseModel):
    entity_type: TicketEntityType
    entity_id: int | None = None
    category: TicketType
    title: str = Field(..., max_length=255)
    message: str = Field(..., min_length=1)

    @model_validator(mode="after")
    def _check_entity_consistency(self) -> "TicketCreate":
        if self.entity_type == TicketEntityType.general:
            if self.entity_id is not None:
                raise ValueError(
                    "Obecný ticket (entity_type='general') nesmí mít entity_id"
                )
        elif self.entity_id is None:
            raise ValueError(
                f"entity_id je povinné pro entity_type='{self.entity_type}'"
            )

        allowed = get_allowed_categories(self.entity_type)
        if self.category not in allowed:
            raise ValueError(
                f"category='{self.category}' není platná pro entity_type='{self.entity_type}' "
                f"(povoleno: {sorted(c.value for c in allowed)})"
            )
        return self


class TicketMessageCreate(BaseModel):
    body: str = Field(..., min_length=1)
    is_internal: bool = False


class TicketMessageItem(ORMModel):
    message_id: int
    ticket_id: int
    author_id: int
    author_display_name: str
    body: str
    is_internal: bool
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def fill_author_display_name(cls, value):
        """Vyplní author_display_name z navázaného ORM vztahu author."""
        if hasattr(value, "author"):
            value.__dict__["author_display_name"] = (
                value.author.display_name if value.author is not None else None
            )
        return value


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


class TicketItem(ORMModel):
    ticket_id: int
    requester_id: int
    requester_display_name: str
    assignee_id: int | None
    assignee_display_name: str | None
    entity_type: TicketEntityType | None
    entity_id: int | None
    course_id: int | None
    category: TicketType
    title: str
    status: TicketStatus
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def fill_display_names(cls, value):
        """Vyplní display names z navázaných ORM vztahů requester/assignee."""
        if hasattr(value, "requester"):
            value.__dict__["requester_display_name"] = (
                value.requester.display_name if value.requester is not None else None
            )
        if hasattr(value, "assignee"):
            value.__dict__["assignee_display_name"] = (
                value.assignee.display_name if value.assignee is not None else None
            )
        return value


class TicketCategoriesResponse(BaseModel):
    entity_type: TicketEntityType
    allowed_categories: list[TicketType]
