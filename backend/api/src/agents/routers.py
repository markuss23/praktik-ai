from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from api.dependencies import CurrentUser
from api.authorization import validate_ownership
from api.src.agents.schemas import (
    GenerateCourseResponse,
    GenerateEmbeddingsResponse,
    LearnBlocksChatRequest,
    LearnBlocksChatResponse,
)
from agents.course_generator import create_graph
from agents.embedding_generator import create_graph as create_embedding_graph
from agents.mentor.graph import create_graph as create_learn_block_mentor_graph
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
            f"Aktuální status: {course.status.value}",
        )

    # Vytvoř a spusť embedding generator graph
    app = create_embedding_graph()
    result = app.invoke({"course_id": course_id, "db": db})

    return GenerateEmbeddingsResponse(
        course_id=result["course_id"],
        blocks_processed=result.get("blocks_processed", 0),
        chunks_created=result.get("chunks_created", 0),
    )


@router.post("/learn-blocks-chat", operation_id="learn_blocks_chat")
async def learn_blocks_chat(
    user_input: LearnBlocksChatRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> LearnBlocksChatResponse:
    """Endpoint pro chat s learn blockem."""

    learn_block_id: int = user_input.learn_block_id
    message: str = user_input.message
    learn_block: models.LearnBlock | None = (
        db.execute(
            select(models.LearnBlock).where(
                models.LearnBlock.learn_id == learn_block_id,
                models.LearnBlock.is_active.is_(True),
            )
        )
        .scalars()
        .first()
    )

    if learn_block is None:
        raise HTTPException(status_code=404, detail="Learn block nenalezen")

    if (
        learn_block.module.course.status == "approved"
        and learn_block.module.course.is_active == True
    ) or (
        learn_block.module.course.status == "archived"
        and learn_block.module.course.is_active == True
    ):
        pass
    else:
        raise HTTPException(
            status_code=400, detail="Learn block není v aktivním a schváleném kurzu"
        )

    app = create_learn_block_mentor_graph()
    result = app.invoke(
        {"learn_block_id": learn_block_id, "message": message, "db": db}
    )

    return LearnBlocksChatResponse(
        answer=result.get("answer", "Odpověď nebyla vygenerována")
    )
