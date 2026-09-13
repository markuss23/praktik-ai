from fastapi import APIRouter
from api.dependencies import CurrentUser, require_role
from api.enums import AssessmentContext
from api.src.assessments import controllers
from api.database import SessionSqlSessionDependency
from api.src.assessments.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentAttachRequest,
    CourseAssessmentResponse,
    CourseAssessmentUpdateRequest,
    SessionAnswerResponse,
    SessionHistoryItem,
    SessionStartResponse,
)


router = APIRouter(tags=["assessments"])


@router.get(
    "/assessment-types",
    operation_id="list_assessment_types",
    dependencies=[require_role("lector")],
)
def list_assessment_types(
    db: SessionSqlSessionDependency,
) -> list[AssessmentTypeResponse]:
    return controllers.get_assessment_types(db)


# Přehled formátů připojených ke kurzu (pro lektorskou editaci)
@router.get(
    "/courses/{course_id}/assessments",
    operation_id="list_course_assessments",
    dependencies=[require_role("lector")],
)
def list_course_assessments(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> list[CourseAssessmentResponse]:
    return controllers.list_course_assessments(db, user, course_id)


# Etapa 1 — připojení formátu ke kurzu (bez nastavení, jede na default_settings)
@router.post(
    "/courses/{course_id}/assessments",
    operation_id="attach_course_assessment",
    status_code=201,
    dependencies=[require_role("lector")],
)
def attach_course_assessment(
    course_id: int,
    body: CourseAssessmentAttachRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> CourseAssessmentResponse:
    return controllers.attach_course_assessment(db, user, course_id, body)


# Etapa 2 — doladění už připojeného formátu (posílá se celý objekt)
@router.put(
    "/assessments/{course_assessment_id}",
    operation_id="update_course_assessment",
    dependencies=[require_role("lector")],
)
def update_course_assessment(
    course_assessment_id: int,
    body: CourseAssessmentUpdateRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> CourseAssessmentResponse:
    return controllers.update_course_assessment(db, user, course_assessment_id, body)


# Odpojení formátu od kurzu (soft delete — rozjeté/dokončené sessions studentů zůstávají)
@router.delete(
    "/assessments/{course_assessment_id}",
    operation_id="detach_course_assessment",
    status_code=204,
    dependencies=[require_role("lector")],
)
def detach_course_assessment(
    course_assessment_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> None:
    controllers.detach_course_assessment(db, user, course_assessment_id)


# Runtime — student spustí session, dostane první otázku
@router.post(
    "/courses/{course_id}/assessments/sessions",
    operation_id="start_assessment_session",
    status_code=201,
)
def start_session(
    course_id: int,
    context: AssessmentContext,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    module_id: int | None = None,
    assessment_type_code: str | None = None,
) -> SessionStartResponse:
    return controllers.start_session(
        db, user, course_id, context, module_id, assessment_type_code
    )


# Runtime — zjištění rozběhnuté session studenta (practice / module assessment / course_final)
@router.get(
    "/courses/{course_id}/assessments/sessions",
    operation_id="get_current_assessment_session",
)
def get_current_session(
    course_id: int,
    context: AssessmentContext,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    module_id: int | None = None,
    assessment_type_code: str | None = None,
) -> SessionStartResponse:
    return controllers.get_current_session(
        db, user, course_id, context, module_id, assessment_type_code
    )


# Runtime — student odevzdá odpověď na aktuální otázku
@router.post(
    "/assessments/sessions/{session_id}/answer",
    operation_id="submit_assessment_answer",
)
def submit_answer(
    session_id: int,
    answer: str,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> SessionAnswerResponse:
    return controllers.submit_answer(db, user, session_id, answer)


# Runtime — historie odevzdaných sessions studenta v rámci kurzu
@router.get(
    "/courses/{course_id}/assessments/history",
    operation_id="get_assessment_session_history",
)
def get_session_history(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> list[SessionHistoryItem]:
    return controllers.get_session_history(db, user, course_id)
