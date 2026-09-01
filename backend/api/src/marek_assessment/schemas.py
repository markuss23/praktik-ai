from pydantic import BaseModel, ConfigDict

from api.enums import AssessmentContext


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


class CourseAssessmentResponse(BaseModel):
    """Konfigurace formátu na kurzu."""

    model_config = ConfigDict(from_attributes=True)

    course_assessment_id: int
    course_id: int
    module_id: int | None
    assessment_type_code: str
    context: AssessmentContext
    settings: dict


class CourseAssessmentSettingsUpdateRequest(BaseModel):
    """Etapa 2 — doladění nastavení už připojeného formátu."""

    settings: dict


class SessionStartResponse(BaseModel):
    """Odpověď na start session — jen otázka k zobrazení, nic víc (zatím)."""

    session_id: int
    question: str
    options: list[str]


class SessionAnswerResponse(BaseModel):
    """Odpověď na odevzdanou odpověď.

    Pokud `finished` je False, `question`/`options` nesou další otázku
    (nebo stejnou znovu, pokud odpověď byla špatně a zbývají pokusy).
    Pokud True, session skončila a je vyplněné `score` (0-100).
    """

    session_id: int
    is_correct: bool
    finished: bool
    question: str | None = None
    options: list[str] | None = None
    score: float | None = None
