"""Pydantic schémata pro API interakčních formátů (assessments)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from agents.assessments.schemas import (  # noqa: F401
    AssessmentView,
    ReviewInput,
    TurnInput,
)
from api.enums import (
    AssessmentContext,
    AssessmentSessionStatus,
    AssessmentTurnRole,
)


# ---------- Katalog formátů ----------


class AssessmentTypeResponse(BaseModel):
    """Jeden interakční formát z katalogu."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str | None
    allowed_contexts: list[AssessmentContext]
    default_settings: dict


# ---------- Konfigurace na kurzu (lektor) ----------


class CourseAssessmentResponse(BaseModel):
    """Konfigurace jednoho formátu na kurzu."""

    model_config = ConfigDict(from_attributes=True)

    course_assessment_id: int
    course_id: int
    module_id: int | None
    assessment_type_code: str
    context: AssessmentContext
    is_enabled: bool
    is_required: bool
    position: int
    settings: dict
    settings_version: int


class CourseAssessmentCreateRequest(BaseModel):
    """Zapnutí formátu na kurzu."""

    assessment_type_code: str = Field(..., description="Kód formátu z katalogu")
    context: AssessmentContext
    module_id: int | None = Field(
        default=None,
        description="Povinné pro practice/assessment, NULL pro course_final",
    )
    is_enabled: bool = True
    is_required: bool = False
    position: int = 0
    settings: dict | None = Field(
        default=None,
        description="Typově specifické nastavení; None = default_settings z katalogu",
    )


class CourseAssessmentUpdateRequest(BaseModel):
    """Částečná úprava konfigurace (jen zaslaná pole)."""

    is_enabled: bool | None = None
    is_required: bool | None = None
    position: int | None = None
    settings: dict | None = None


# ---------- Runtime (student) ----------


class SessionStateResponse(BaseModel):
    """Stav session — obálka + typovaný view (discriminated union)."""

    session_id: int
    status: AssessmentSessionStatus
    view: AssessmentView


# ---------- Review (lektor) ----------


class SessionSummaryResponse(BaseModel):
    """Řádek v přehledu sessions pro lektora (např. čekající na hodnocení)."""

    model_config = ConfigDict(from_attributes=True)

    session_id: int
    course_assessment_id: int
    assessment_type_code: str
    user_id: int
    status: AssessmentSessionStatus
    score: float | None
    is_passed: bool | None
    created_at: datetime
    finished_at: datetime | None


class TurnResponse(BaseModel):
    """Jeden tah session — pro hodnotitele (odpovědi studenta, AI drafty)."""

    model_config = ConfigDict(from_attributes=True)

    turn_id: int
    role: AssessmentTurnRole
    content: str | None
    payload: dict | None
    created_at: datetime


class ReviewDetailResponse(BaseModel):
    """Podklad pro hodnotitele — celý průběh session."""

    session_id: int
    course_assessment_id: int
    assessment_type_code: str
    user_id: int
    status: AssessmentSessionStatus
    settings_snapshot: dict
    turns: list[TurnResponse]
