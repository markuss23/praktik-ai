import asyncio

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select, update

from api.dependencies import CurrentUser, require_role
from api.authorization import validate_owner_or_superadmin
from api.src.common.utils import get_or_404, check_enrollment
from api.src.agents.schemas import (
    CourseGenerationProgressResponse,
    EvaluateAssessmentRequest,
    EvaluateAssessmentResponse,
    EvaluatePracticeAnswerRequest,
    EvaluatePracticeAnswerResponse,
    GenerateAssessmentRequest,
    GenerateAssessmentResponse,
    GenerateCourseResponse,
    GenerateEmbeddingsResponse,
    GeneratePracticeQuestionRequest,
    GeneratePracticeQuestionResponse,
    LearnBlocksChatRequest,
    LearnBlocksChatResponse,
)
from api.src.agents.progress import (
    get_progress,
    is_running,
    list_running_course_ids,
    mark_completed,
    mark_failed,
    register_task,
    set_progress,
    unregister_task,
)
from api.database import SessionLocal
from api.src.agents.practice_controllers import (
    generate_practice_question,
    evaluate_practice_answer,
)
from agents.course_generator.service import CourseGeneratorService
from agents.embedding_generator.service import EmbeddingGeneratorService
from agents.mentor.service import MentorService
from agents.assessment_generator.service import AssessmentService
from agents.assessment_evaluator.service import EvaluationService
from api.database import SessionSqlSessionDependency
from api import models

router = APIRouter(prefix="/agents", tags=["agents"])


async def _run_course_generation(course_id: int) -> None:
    """Background task: spustí CourseGeneratorService s vlastní DB session.

    Běží nezávisle na původním HTTP requestu, takže refresh stránky
    klienta generování nepřeruší. Stav je dostupný přes
    ``/agents/course-progress/{course_id}``.
    """
    db = SessionLocal()
    try:
        service = CourseGeneratorService(db=db, course_id=course_id)
        try:
            await service.generate()
        except Exception as e:  # noqa: BLE001 — chceme zachytit cokoliv
            mark_failed(course_id, str(e))
            try:
                db.rollback()
                db.execute(
                    update(models.Course)
                    .where(models.Course.course_id == course_id)
                    .values(status=models.Status.failed)
                )
                db.commit()
            except Exception:  # noqa: BLE001
                db.rollback()
            return
        mark_completed(course_id)
    finally:
        db.close()
        unregister_task(course_id)


@router.post("/generate-course", operation_id="generate_course", dependencies=[require_role("lector")])
async def generate_course(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> GenerateCourseResponse:
    """Spustí AI generování kurzu jako background task a vrátí se ihned.

    Klient si průběh sleduje pollingem ``/agents/course-progress/{course_id}``.
    Díky odpojení od HTTP requestu generování pokračuje i po refreshi stránky.
    """

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    # Validace vlastnictví
    validate_owner_or_superadmin(course, user, "kurz")

    if course.status != models.Status.draft and course.status != models.Status.failed:
        raise HTTPException(
            status_code=400, detail="Lze generovat pouze pokud kurz je ve stavu draft"
        )

    # Idempotence: pokud už pro tento kurz běží task, vrať se s prázdným výsledkem
    # (klient se připojí přes progress endpoint).
    if is_running(course_id):
        return GenerateCourseResponse(title=course.title, modules=[])

    set_progress(course_id, step=0, label="Spouštění generování")
    task = asyncio.create_task(_run_course_generation(course_id))
    register_task(course_id, task)

    return GenerateCourseResponse(title=course.title, modules=[])


@router.get(
    "/course-progress/{course_id}",
    operation_id="get_course_generation_progress",
    dependencies=[require_role("lector")],
)
async def get_course_generation_progress(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> CourseGenerationProgressResponse:
    """Vrátí průběh AI generování kurzu."""

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")

    progress = get_progress(course_id)
    if progress is None:
        return CourseGenerationProgressResponse(
            step=0, total=5, label="Čekání", status="pending", error=None
        )

    return CourseGenerationProgressResponse(
        step=progress.step,
        total=progress.total,
        label=progress.label,
        status=progress.status,
        error=progress.error,
    )


@router.get(
    "/active-course-generation",
    operation_id="get_active_course_generation",
    dependencies=[require_role("lector")],
)
async def get_active_course_generation(
    db: SessionSqlSessionDependency, user: CurrentUser
) -> int | None:
    """Vrátí course_id právě běžící generace pro přihlášeného uživatele,
    nebo ``null`` pokud žádná neběží.

    Slouží frontendu k obnovení UI po refreshi stránky uprostřed generování.
    Superadmin vidí i cizí běžící generace, ostatní jen svoje vlastní.
    """
    candidates = list_running_course_ids()
    if not candidates:
        return None

    is_super = user.role == "superadmin"
    for course_id in candidates:
        course = db.get(models.Course, course_id)
        if course is None:
            continue
        if is_super or course.owner_id == user.user_id:
            return course_id
    return None


@router.post("/generate-course-embeddings", operation_id="generate_course_embeddings", dependencies=[require_role("lector")])
async def generate_course_embeddings(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> GenerateEmbeddingsResponse:
    """Endpoint pro generování embeddingů pro LearnBlocky v kurzu."""

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    # Validace vlastnictví
    validate_owner_or_superadmin(course, user, "kurz")

    # Kontrola statusu kurzu
    if course.status != models.Status.approved:
        raise HTTPException(
            status_code=400,
            detail=f"Embeddingy lze generovat pouze pro kurzy se statusem 'approved'. "
            f"Aktuální status: {course.status.value}",
        )

    service = EmbeddingGeneratorService(db=db, course_id=course_id)

    result = await service.generate()

    return GenerateEmbeddingsResponse(
        course_id=result.course_id,
        blocks_processed=result.blocks_processed,
        chunks_created=result.chunks_created,
    )


@router.post("/learn-blocks-chat", operation_id="learn_blocks_chat")
async def learn_blocks_chat(
    user_input: LearnBlocksChatRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> LearnBlocksChatResponse:
    """Endpoint pro chat s learn blockem."""

    learn_block = get_or_404(db, models.LearnBlock, user_input.learn_block_id, detail="Learn block nenalezen")

    if not (
        learn_block.module.course.is_active
        and learn_block.module.course.status in ("approved", "archived")
    ):
        raise HTTPException(
            status_code=400, detail="Learn block není v aktivním a schváleném kurzu"
        )
    course = learn_block.module.course

    # Owner and superadmin can use the tutor without enrollment
    check_enrollment(db, user, course, bypass_for_owner=True)

    service = MentorService(
        db=db,
        learn_block_id=user_input.learn_block_id,
        user_id=user.user_id,
        message=user_input.message,
    )

    result = await service.chat()

    log = models.MentorInteractionLog(
        user_id=user.user_id,
        learn_id=user_input.learn_block_id,
        user_message=user_input.message,
        ai_response=result.answer,
    )
    db.add(log)
    db.commit()

    return LearnBlocksChatResponse(answer=result.answer)


@router.post(
    "/generate-assessment",
    operation_id="generate_assessment",
)
async def generate_assessment(
    body: GenerateAssessmentRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> GenerateAssessmentResponse:
    """Vygeneruje assessment otázku pro modul. Vyžaduje zápis do kurzu."""

    module = get_or_404(db, models.Module, body.module_id, detail="Modul nenalezen")

    course = module.course
    if not course.is_active or course.status not in ("approved", "archived"):
        raise HTTPException(
            status_code=400,
            detail="Modul není v aktivním a schváleném kurzu",
        )

    # Ověření zápisu – platí pro všechny uživatele včetně vlastníka a superadmina
    check_enrollment(db, user, course)

    # Nelze generovat, pokud existuje session ve stavu passed nebo in_progress
    existing_session: models.ModuleTaskSession | None = (
        db.execute(
            select(models.ModuleTaskSession).where(
                models.ModuleTaskSession.user_id == user.user_id,
                models.ModuleTaskSession.module_id == body.module_id,
                models.ModuleTaskSession.is_active.is_(True),
                models.ModuleTaskSession.status.in_(
                    [
                        models.ModuleTaskSessionStatus.passed,
                        models.ModuleTaskSessionStatus.in_progress,
                    ]
                ),
            )
        )
        .scalars()
        .first()
    )
    if existing_session is not None:
        if existing_session.status == models.ModuleTaskSessionStatus.passed:
            raise HTTPException(
                status_code=409,
                detail="Tento modul jste již úspěšně splnili",
            )
        raise HTTPException(
            status_code=409,
            detail="Pro tento modul již máte aktivní assessment",
        )

    service = AssessmentService(db=db, module_id=body.module_id, user_id=user.user_id)

    try:
        result = await service.generate()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return GenerateAssessmentResponse(
        session_id=result.session_id,
        generated_question=result.generated_question,
    )


@router.post(
    "/evaluate-assessment",
    operation_id="evaluate_assessment",
)
async def evaluate_assessment(
    body: EvaluateAssessmentRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> EvaluateAssessmentResponse:
    """Vyhodnotí odpověď studenta na assessment otázku."""

    # Ověření, že session patří tomuto uživateli
    session: models.ModuleTaskSession | None = (
        db.execute(
            select(models.ModuleTaskSession).where(
                models.ModuleTaskSession.session_id == body.session_id,
                models.ModuleTaskSession.user_id == user.user_id,
                models.ModuleTaskSession.is_active.is_(True),
            )
        )
        .scalars()
        .first()
    )

    if session is None:
        raise HTTPException(status_code=404, detail="Assessment session nenalezena")

    if session.status != models.ModuleTaskSessionStatus.in_progress:
        raise HTTPException(
            status_code=400,
            detail=f"Session není ve stavu in_progress (aktuální: {session.status.value})",
        )

    # Kontrola počtu pokusů proti max_task_attempts modulu
    module = session.module
    evaluated_attempts_count: int = db.execute(
        select(func.count()).where(
            models.TaskAttempt.session_id == session.session_id,
            models.TaskAttempt.status == models.AttemptStatus.evaluated,
        )
    ).scalar_one()

    if evaluated_attempts_count >= module.max_task_attempts:
        raise HTTPException(
            status_code=409,
            detail=f"Vyčerpali jste maximální počet pokusů ({module.max_task_attempts}) pro tento modul",
        )

    service = EvaluationService(
        db=db,
        session_id=body.session_id,
        user_id=user.user_id,
        user_response=body.user_response,
    )

    try:
        result = await service.evaluate()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return EvaluateAssessmentResponse(
        attempt_id=result.attempt_id,
        ai_score=result.ai_score,
        is_passed=result.is_passed,
        ai_feedback=result.ai_feedback,
    )


@router.post(
    "/generate-practice-question",
    operation_id="generate_practice_question",
)
async def endp_generate_practice_question(
    body: GeneratePracticeQuestionRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> GeneratePracticeQuestionResponse:
    """Vygeneruje personalizovanou procvičovací otázku z obsahu modulu."""
    return await generate_practice_question(
        db=db,
        module_id=body.module_id,
        question_type=body.question_type,
        user=user,
    )


@router.post(
    "/evaluate-practice-answer",
    operation_id="evaluate_practice_answer",
)
async def endp_evaluate_practice_answer(
    body: EvaluatePracticeAnswerRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> EvaluatePracticeAnswerResponse:
    """Vyhodnotí odpověď studenta na procvičovací otázku."""
    return await evaluate_practice_answer(
        db=db,
        user_question_id=body.user_question_id,
        user_input=body.user_input,
        user=user,
    )
