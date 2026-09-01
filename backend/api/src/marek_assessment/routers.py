from fastapi import APIRouter
from api.dependencies import CurrentUser, require_role
from api.enums import AssessmentContext
from api.src.marek_assessment import controllers
from api.database import SessionSqlSessionDependency
from api.src.marek_assessment.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentAttachRequest,
    CourseAssessmentResponse,
    CourseAssessmentSettingsUpdateRequest,
    SessionAnswerResponse,
    SessionStartResponse,
)


router = APIRouter(tags=["marek_assessments"])


@router.get("/m-assessment-types", dependencies=[require_role("lector")])
def list_assessment_types(
    db: SessionSqlSessionDependency,
) -> list[AssessmentTypeResponse]:
    return controllers.get_assessment_types(db)


# Etapa 1 — připojení formátu ke kurzu (bez nastavení, jede na default_settings)
@router.post(
    "/courses/{course_id}/m-assessments",
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


# Etapa 2 — doladění nastavení už připojeného formátu
@router.patch(
    "/m-assessments/{course_assessment_id}/settings",
    dependencies=[require_role("lector")],
)
def update_course_assessment_settings(
    course_assessment_id: int,
    body: CourseAssessmentSettingsUpdateRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> CourseAssessmentResponse:
    return controllers.update_course_assessment_settings(
        db, user, course_assessment_id, body
    )


# Runtime — student spustí session, dostane první otázku
@router.post("/courses/{course_id}/m-assessments/sessions", status_code=201)
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
@router.get("/courses/{course_id}/m-assessments/sessions")
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
@router.post("/m-assessments/sessions/{session_id}/answer")
def submit_answer(
    session_id: int,
    answer: str,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> SessionAnswerResponse:
    return controllers.submit_answer(db, user, session_id, answer)


# Runtime — historie odevzdaných sessions studenta v rámci kurzu
@router.get("/courses/{course_id}/m-assessments/history")
def get_session_history(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
):
    return controllers.get_session_history(db, user, course_id)
