from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from api.dependencies import CurrentUser, require_role
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


@router.post("/generate-course", operation_id="generate_course", dependencies=[require_role("lector")])
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

    if course.status != models.Status.draft and course.status != models.Status.failed:
        raise HTTPException(
            status_code=400, detail="Lze generovat pouze pokud kurz je ve stavu draft"
        )

    app = create_graph()

    try:
        result = await app.ainvoke({"course_id": course_id, "db": db})
    except Exception as e:
        db.execute(
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(status=models.Status.failed)
        )
        db.commit()
        raise HTTPException(status_code=500, detail=str(e)) from e

    course = result.get("course")

    return GenerateCourseResponse(
        title=course.title,
        modules=[module.model_dump() for module in course.modules],
    )


@router.post("/generate-course-embeddings", operation_id="generate_course_embeddings", dependencies=[require_role("lector")])
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
    result = await app.ainvoke({"course_id": course_id, "db": db})

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

    if not (
        learn_block.module.course.is_active
        and learn_block.module.course.status in ("approved", "archived")
    ):
        raise HTTPException(
            status_code=400, detail="Learn block není v aktivním a schváleném kurzu"
        )
    print(f"User {user.user_id} is trying to chat with learn block {learn_block_id} in course {learn_block.module.course.course_id}")
    enrollment = db.execute(
        select(models.Enrollment).where(
            models.Enrollment.user_id == user.user_id,
            models.Enrollment.course_id == learn_block.module.course.course_id,
            models.Enrollment.is_active.is_(True),
        )
    ).scalars().first()

    if enrollment is None:
        raise HTTPException(
            status_code=403, detail="Nejste zapsáni v tomto kurzu"
        )

    app = create_learn_block_mentor_graph()
    result = await app.ainvoke(
        {"learn_block_id": learn_block_id, "user_id": user.user_id, "message": message, "db": db}
    )

    answer = result.get("answer", "Odpověď nebyla vygenerována")

    log = models.MentorInteractionLog(
        user_id=user.user_id,
        learn_id=learn_block_id,
        user_message=message,
        ai_response=answer,
    )
    db.add(log)
    db.commit()

    return LearnBlocksChatResponse(answer=answer)
