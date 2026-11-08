from datetime import datetime

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, PlainValidator, TypeAdapter

from api.enums import AssessmentContext, AssessmentSessionStatus
from api.src.assessments.closed_questions.schemas import ClosedQuestionsSettings
from api.src.assessments.closed_questions_ai.schemas import ClosedQuestionsAISettings
from api.src.assessments.open_question_ai.schemas import OpenQuestionAISettings
from api.src.assessments.pretest.schemas import PretestSettings
from api.src.assessments.socratic_dialog_ai.schemas import SocraticDialogAISettings

# Nastavení kteréhokoliv formátu. Za běhu je to obyčejný dict: formát určuje
# assessment_type_code a validaci dělá parse_settings proti správné třídě.
# Union níž slouží jen pro OpenAPI (typy ve FE klientovi), nic nevybírá, pořadí je jedno.
# Nový formát sem přidá svůj Settings.
_SettingsDoc = (
    PretestSettings
    | OpenQuestionAISettings
    | ClosedQuestionsAISettings
    | ClosedQuestionsSettings
    | SocraticDialogAISettings
)


class _JsonSchemaAs:
    """Do OpenAPI dá schéma `_SettingsDoc` místo obecného objektu."""

    def __get_pydantic_json_schema__(self, core_schema, handler):
        return handler(TypeAdapter(_SettingsDoc).core_schema)


def _require_object(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("settings musí být objekt")
    return value


AssessmentSettings = Annotated[
    dict[str, Any], PlainValidator(_require_object), _JsonSchemaAs()
]


class AssessmentTypeResponse(BaseModel):
    """Jeden interakční formát z katalogu."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str | None
    allowed_contexts: list[AssessmentContext]
    default_settings: AssessmentSettings


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
    settings: AssessmentSettings


class CourseAssessmentUpdateRequest(BaseModel):
    """Etapa 2 — doladění už připojeného formátu. Posílá se celý objekt."""

    settings: AssessmentSettings
    is_enabled: bool
    is_required: bool


class SessionStartResponse(BaseModel):
    """Odpověď na start session — jen otázka k zobrazení, nic víc (zatím)."""

    session_id: int
    question: str
    options: list[str] | None = None


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
    feedback: str | None = None


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
    attempts_used: int


class AssessmentProgressItem(BaseModel):
    """Jeden test (konfigurace formátu) a jestli ho student splnil."""

    course_assessment_id: int
    assessment_type_code: str
    context: AssessmentContext
    is_required: bool
    passed: bool
    # Kdy ho student splnil poprvé
    passed_at: datetime | None


class ModuleProgressItem(BaseModel):
    module_id: int
    # Splněné všechny povinné testy modulu
    completed: bool
    # Splnění posledního povinného testu; None = nehotový nebo bez povinných
    completed_at: datetime | None
    assessments: list[AssessmentProgressItem]


class CourseProgressResponse(BaseModel):
    """Co má student v kurzu splněné — viz course_completion v utils.py."""

    modules: list[ModuleProgressItem]
    course_final: list[AssessmentProgressItem]
    course_completed: bool
    course_completed_at: datetime | None
