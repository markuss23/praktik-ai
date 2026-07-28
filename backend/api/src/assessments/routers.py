"""
Routery interakčních formátů (assessments).

Generické — nový formát testování NEPŘIDÁVÁ žádný endpoint.
Typová logika žije v agents/assessments, dispatch dělají controllery.
"""

from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.assessments import controllers
from api.src.assessments.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentCreateRequest,
    CourseAssessmentResponse,
    CourseAssessmentUpdateRequest,
    SessionStateResponse,
    TurnInput,
)

router = APIRouter(tags=["assessments"])


# ---------- Katalog ----------


@router.get("/assessment-types", operation_id="list_assessment_types")
def list_assessment_types(
    db: SessionSqlSessionDependency, user: CurrentUser
) -> list[AssessmentTypeResponse]:
    """Katalog dostupných interakčních formátů."""
    return controllers.list_assessment_types(db)


# ---------- Konfigurace na kurzu ----------


@router.get(
    "/courses/{course_id}/assessments",
    operation_id="list_course_assessments",
)
def list_course_assessments(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> list[CourseAssessmentResponse]:
    """Formáty nakonfigurované na kurzu.

    Vlastník a superadmin vidí všechny, zapsaný student jen zapnuté.
    """
    return controllers.list_course_assessments(db, user, course_id)


@router.post(
    "/courses/{course_id}/assessments",
    operation_id="create_course_assessment",
    status_code=201,
    dependencies=[require_role("lector")],
)
def create_course_assessment(
    course_id: int,
    body: CourseAssessmentCreateRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> CourseAssessmentResponse:
    """Zapne interakční formát na kurzu (practice/assessment na modulu, course_final na kurzu)."""
    return controllers.create_course_assessment(db, user, course_id, body)


@router.patch(
    "/course-assessments/{course_assessment_id}",
    operation_id="update_course_assessment",
    dependencies=[require_role("lector")],
)
def update_course_assessment(
    course_assessment_id: int,
    body: CourseAssessmentUpdateRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> CourseAssessmentResponse:
    """Upraví konfiguraci formátu (settings se validují proti schématu formátu)."""
    return controllers.update_course_assessment(db, user, course_assessment_id, body)


@router.delete(
    "/course-assessments/{course_assessment_id}",
    operation_id="delete_course_assessment",
    status_code=204,
    dependencies=[require_role("lector")],
)
def delete_course_assessment(
    course_assessment_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> None:
    """Vypne formát na kurzu (soft delete — sessions studentů zůstávají)."""
    controllers.delete_course_assessment(db, user, course_assessment_id)


# ---------- Runtime (student) ----------


@router.post(
    "/course-assessments/{course_assessment_id}/sessions",
    operation_id="start_assessment_session",
    status_code=201,
)
async def start_assessment_session(
    course_assessment_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> SessionStateResponse:
    """Spustí session formátu. Existující rozběhnutá session se vrátí (idempotentní)."""
    return await controllers.start_session(db, user, course_assessment_id)


@router.get(
    "/course-assessments/{course_assessment_id}/sessions/current",
    operation_id="get_current_assessment_session",
)
def get_current_assessment_session(
    course_assessment_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> SessionStateResponse:
    """Rozběhnutá session přihlášeného studenta — obnova UI po refreshi. 404 pokud žádná."""
    return controllers.get_current_session(db, user, course_assessment_id)


@router.post(
    "/assessment-sessions/{session_id}/turns",
    operation_id="submit_assessment_turn",
)
async def submit_assessment_turn(
    session_id: int,
    body: TurnInput,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> SessionStateResponse:
    """Tah studenta (odpověď, otázky, ukončení...) — tvar podle formátu (pole `kind`)."""
    return await controllers.submit_turn(db, user, session_id, body)


@router.get(
    "/assessment-sessions/{session_id}",
    operation_id="get_assessment_session",
)
def get_assessment_session(
    session_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> SessionStateResponse:
    """Aktuální stav session (rekonstruovaný z DB)."""
    return controllers.get_session_state(db, user, session_id)
