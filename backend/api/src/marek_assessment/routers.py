from fastapi import APIRouter
from api.dependencies import CurrentUser, require_role
from api.src.marek_assessment import controllers
from api.database import SessionSqlSessionDependency
from api.src.marek_assessment.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentAttachRequest,
    CourseAssessmentResponse,
    CourseAssessmentSettingsUpdateRequest,
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
