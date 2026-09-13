from datetime import datetime

from pydantic import BaseModel, ConfigDict

from api.enums import AssessmentContext, AssessmentSessionStatus


class AssessmentTypeResponse(BaseModel):
    """Jeden interakční formát z katalogu."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str | None
    allowed_contexts: list[AssessmentContext]
    default_settings: dict


class CourseAssessmentAttachRequest(BaseModel):
    """Etapa 1 — připojení formátu ke kurzu, bez nastavení (jede na default_settings)."""

    assessment_type_code: str
    context: AssessmentContext
    module_id: int | None = None
    is_enabled: bool = True
    # True = student musí projít, než mu systém pustí navazující kontext
    is_required: bool = False


class CourseAssessmentResponse(BaseModel):
    """Konfigurace formátu na kurzu."""

    model_config = ConfigDict(from_attributes=True)

    course_assessment_id: int
    course_id: int
    module_id: int | None
    assessment_type_code: str
    context: AssessmentContext
    is_enabled: bool
    is_required: bool
    settings: dict


class CourseAssessmentUpdateRequest(BaseModel):
    """Etapa 2 — doladění už připojeného formátu. Posílá se celý objekt."""

    settings: dict
    is_enabled: bool
    is_required: bool


class SessionStartResponse(BaseModel):
    """Odpověď na start session — jen otázka k zobrazení, nic víc (zatím)."""

    session_id: int
    question: str
    options: list[str]


class SessionAnswerResponse(BaseModel):
    """Odpověď na odevzdanou odpověď.

    Pokud `finished` je False, `question`/`options` nesou další otázku
    (nebo stejnou znovu, pokud odpověď byla špatně a zbývají pokusy).
    Pokud True, session skončila a jsou vyplněné `score` (0-100) a `is_passed`.
    """

    session_id: int
    is_correct: bool
    finished: bool
    question: str | None = None
    options: list[str] | None = None
    score: float | None = None
    is_passed: bool | None = None


class SessionHistoryItem(BaseModel):
    """Jeden běh studenta v historii kurzu.

    `score`/`is_passed`/`finished_at` jsou vyplněné až u dokončené session.
    """

    session_id: int
    assessment_type_code: str
    context: AssessmentContext
    module_id: int | None
    status: AssessmentSessionStatus
    score: float | None
    is_passed: bool | None
    started_at: datetime
    finished_at: datetime | None
