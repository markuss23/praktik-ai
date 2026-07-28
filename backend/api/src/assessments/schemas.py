"""Pydantic schémata pro API interakčních formátů (assessments)."""

from pydantic import BaseModel, ConfigDict, Field

from agents.assessments.schemas import AssessmentView, TurnInput  # noqa: F401
from api.enums import AssessmentContext, AssessmentSessionStatus


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
    settings: dict


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
    settings: dict | None = Field(
        default=None,
        description="Typově specifické nastavení; None = default_settings z katalogu",
    )


class CourseAssessmentUpdateRequest(BaseModel):
    """Částečná úprava konfigurace (jen zaslaná pole)."""

    is_enabled: bool | None = None
    is_required: bool | None = None
    settings: dict | None = None


# ---------- Runtime (student) ----------


class SessionStateResponse(BaseModel):
    """Stav session — obálka + typovaný view (discriminated union)."""

    session_id: int
    status: AssessmentSessionStatus
    view: AssessmentView
