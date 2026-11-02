from datetime import datetime

from pydantic import BaseModel, Field

from api.enums import EmailStatus, NotificationEvent, UserRole
from api.src.common.schemas import ORMModel


class UserResponse(ORMModel):
    user_id: int
    sub: str
    email: str
    display_name: str | None
    role: UserRole
    is_active: bool
    ai_tone: str
    ai_expression_level: str


class ProfileUpdate(BaseModel):
    ai_tone: str = Field(..., max_length=100)
    ai_expression_level: str = Field(..., max_length=100)


class ProfileNameUpdate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255)


class NotificationPreferenceItem(BaseModel):
    """Jedna e-mailová notifikace v nastavení profilu."""

    event_key: NotificationEvent
    label: str
    description: str
    enabled: bool
    mandatory: bool = Field(description="True = povinná notifikace, nelze ji vypnout")


class NotificationPreferenceUpdateItem(BaseModel):
    event_key: NotificationEvent
    enabled: bool


class NotificationPreferencesUpdate(BaseModel):
    items: list[NotificationPreferenceUpdateItem]


class EmailLogItem(BaseModel):
    """Jeden odeslaný e-mail v historii na profilu (bez textu chyby SMTP)."""

    log_id: int
    event_key: str
    label: str = Field(description="Čitelný název události")
    course_id: int | None
    course_title: str | None
    subject: str
    body: str | None
    status: EmailStatus
    created_at: datetime


class EmailLogPage(BaseModel):
    items: list[EmailLogItem]
    total: int
