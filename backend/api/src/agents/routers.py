from fastapi import APIRouter, HTTPException, UploadFile
from sqlalchemy import select

from api.dependencies import CurrentUser
from api.authorization import validate_ownership
from api.src.agents.schemas import (
    GenerateCourseRequest,
    GenerateCourseResponse,
    GenerateEmbeddingsResponse,
)
from agents.course_generator import create_graph
from agents.embedding_generator import create_graph as create_embedding_graph
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


@router.post("/generate-course-embeddings", operation_id="generate_course_embeddings")
async def generate_course_embeddings(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> GenerateEmbeddingsResponse:
    """Endpoint pro generování embeddingů pro LearnBlocky v kurzu."""

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

    # Kontrola statusu kurzu
    if course.status != models.Status.approved:
        raise HTTPException(
            status_code=400,
            detail=f"Embeddingy lze generovat pouze pro kurzy se statusem 'approved'. "
                   f"Aktuální status: {course.status.value}"
        )

    # Vytvoř a spusť embedding generator graph
    app = create_embedding_graph()
    result = app.invoke({"course_id": course_id, "db": db})

    return GenerateEmbeddingsResponse(
        course_id=result["course_id"],
        blocks_processed=result.get("blocks_processed", 0),
        chunks_created=result.get("chunks_created", 0),
    )
