from fastapi import APIRouter, HTTPException, UploadFile
from sqlalchemy import select

from api.dependencies import CurrentUser
from api.authorization import validate_ownership
from api.src.agents.schemas import GenerateCourseRequest, GenerateCourseResponse
from agents.course_generator import create_graph
from api.database import SessionSqlSessionDependency
from api import models

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/generate-course", operation_id="generate_course")
async def generate_course(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> GenerateCourseResponse:
    """Endpoint pro generování kurzu z obsahu."""

    course: models.Course | None = (
        db.execute(
            select(models.Course).where(
                models.Course.course_id == course_id, models.Course.is_active.is_(True)
            )
        )
        .scalars()
        .first()
    )

    if course is None:
        raise HTTPException(status_code=404, detail="Kurz nenalezen")
    
    # Validace vlastnictví
    validate_ownership(course, user, "kurz")

    if course.status != models.Status.draft:
        raise HTTPException(
            status_code=400, detail="Lze generovat pouze pokud kurz je ve stavu draft"
        )

    app = create_graph()

    result = app.invoke({"course_id": course_id, "db": db})

    course = result.get("course")

    return GenerateCourseResponse(
        title=course.title,
        modules=[module.model_dump() for module in course.modules],
    )
