import asyncio
import base64

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select, update

from agents.sql_agent.service import SQLAgentResult, SQLAgentService
from api.dependencies import CurrentUser, require_role
from api.authorization import validate_owner_or_superadmin
from api.src.common.utils import get_or_404, check_enrollment
from api.src.agents.schemas import (
    ActiveImageGeneration,
    CourseGenerationProgressResponse,
    EvaluateAssessmentRequest,
    EvaluateAssessmentResponse,
    EvaluateOpenQuestionRequest,
    EvaluatePracticeAnswerRequest,
    EvaluatePracticeAnswerResponse,
    GenerateAssessmentRequest,
    GenerateAssessmentResponse,
    GenerateCourseResponse,
    GenerateEmbeddingsResponse,
    GenerateImageResponse,
    GeneratePracticeQuestionRequest,
    ImageGenerationProgressResponse,
    GeneratePracticeQuestionResponse,
    LearnBlocksChatRequest,
    LearnBlocksChatResponse,
    WikiChatRequest,
    WikiChatResponse,
    WikiSyncResponse,
)
from api.src.agents.typing_guard import typed_too_fast
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
from api.src.agents.image_progress import (
    IMAGE_GENERATION_TOTAL_STEPS,
    get_image_progress,
    is_image_running,
    list_running_image_ids,
    mark_image_completed,
    mark_image_failed,
    progress_key,
    register_image_task,
    set_image_progress,
    unregister_image_task,
)
from api.database import SessionLocal
from api.storage import seaweedfs
from api.src.agents.practice_controllers import (
    generate_practice_question,
    evaluate_practice_answer,
    evaluate_open_question_answer,
)
from agents.open_question_evaluator import OpenQuestionEvaluation
from agents.course_generator.service import CourseGeneratorService
from agents.embedding_generator.service import EmbeddingGeneratorService
from agents.image_generator.course.service import CourseImageGeneratorService
from agents.image_generator.module.service import ModuleImageGeneratorService
from agents.image_generator.service import ImageGenerationResult
from agents.mentor.service import MentorService
from agents.wiki.mentor.service import WikiChatService
from agents.wiki.agent.service import sync_wiki
from agents.assessment_generator.service import AssessmentService
from agents.assessment_evaluator.service import EvaluationService
from api.database import SessionSqlSessionDependency
from api import models

router = APIRouter(prefix="/agents", tags=["agents"])
# Bez autentizace — wiki chat je nápověda pro všechny návštěvníky
public_router = APIRouter(prefix="/agents", tags=["agents"])


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


@router.post(
    "/generate-course",
    operation_id="generate_course",
    dependencies=[require_role("lector")],
)
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
    "/active-course-generations",
    operation_id="list_active_course_generations",
    dependencies=[require_role("lector")],
)
async def list_active_course_generations(
    db: SessionSqlSessionDependency, user: CurrentUser
) -> list[int]:
    """Vrátí course_id všech právě běžících generací, které přihlášený
    uživatel smí vidět (prázdný seznam, pokud žádná neběží).

    Slouží frontendu k obnovení sledování průběhu po refreshi stránky.
    Superadmin vidí i cizí běžící generace, ostatní jen svoje vlastní.
    """
    candidates = list_running_course_ids()
    if not candidates:
        return []

    is_super = user.role == "superadmin"
    visible: list[int] = []
    for course_id in candidates:
        course = db.get(models.Course, course_id)
        if course is None:
            continue
        if is_super or course.owner_id == user.user_id:
            visible.append(course_id)
    return visible


@router.post(
    "/generate-course-embeddings",
    operation_id="generate_course_embeddings",
    dependencies=[require_role("lector")],
)
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


def _upload_image_to_seaweedfs(
    result: ImageGenerationResult, remote_dir: str, basename: str
) -> GenerateImageResponse:
    """Nahraje vygenerovaný obrázek do SeaweedFS a vrátí jeho cestu.

    Soubor se uloží jako `<remote_dir>/<basename>.<ext>`, přípona se odvodí z MIME
    typu v data URI.
    Opakované generování soubor přepíše.

    """
    remote_dir = remote_dir.strip("/")
    image = result.result

    # image_url je data URI "data:<mime>;base64,<data>"
    header, b64_data = image.image_url.split(",", 1)
    mime = header.removeprefix("data:").split(";", 1)[0]
    ext = "svg" if "svg" in mime else mime.split("/", 1)[1]
    filename = f"{basename}.{ext}"
    file_path = f"{remote_dir}/{filename}"
    seaweedfs.upload_file(file_path, base64.b64decode(b64_data), filename, mime)

    return GenerateImageResponse(
        image_spec=result.image_spec.model_dump(),
        image_prompt=result.image_prompt,
        model_name=image.model_name,
        latency_ms=image.latency_ms,
        file_path=file_path,
    )


async def _run_image_generation(key: str, kind: str, entity_id: int) -> None:
    """Background task: vygeneruje obrázek kurzu / modulu s vlastní DB session.

    Běží nezávisle na původním HTTP requestu (stejně jako generování kurzu);
    průběh a výsledek jsou dostupné přes progress endpointy.

    Args:
        key: Klíč trackeru průběhu (``progress_key(kind, entity_id)``).
        kind: "course" nebo "module".
        entity_id: course_id, resp. module_id.
    """
    db = SessionLocal()
    try:
        set_image_progress(key, step=1, label="Načítání kontextu z databáze")
        if kind == "course":
            service = CourseImageGeneratorService(
                db=db, course_id=entity_id, progress_key=key
            )
            remote_dir = f"course-images/{entity_id}"
        else:
            service = ModuleImageGeneratorService(
                db=db, module_id=entity_id, progress_key=key
            )
            remote_dir = f"module-images/{entity_id}"

        result = await service.generate()

        set_image_progress(key, step=4, label="Ukládání obrázku do SeaweedFS")
        response = _upload_image_to_seaweedfs(
            result, remote_dir=remote_dir, basename="image"
        )
        mark_image_completed(key, response.model_dump())
    except Exception as e:  # noqa: BLE001 — chceme zachytit cokoliv
        mark_image_failed(key, str(e))
    finally:
        db.close()
        unregister_image_task(key)


def _start_image_generation(
    kind: str, entity_id: int
) -> ImageGenerationProgressResponse:
    """Spustí generování obrázku jako background task (idempotentně) a vrátí aktuální průběh.

    Pokud pro daný kurz / modul už task běží, nový se nespouští a vrátí se
    stávající průběh (klient se připojí přes progress endpoint).

    Args:
        kind: "course" nebo "module".
        entity_id: course_id, resp. module_id.
    """
    key = progress_key(kind, entity_id)

    if not is_image_running(key):
        set_image_progress(key, step=0, label="Spouštění generování")
        task = asyncio.create_task(_run_image_generation(key, kind, entity_id))
        register_image_task(key, task)

    return _image_progress_response(key)


def _image_progress_response(key: str) -> ImageGenerationProgressResponse:
    """Převede záznam trackeru na response; bez záznamu vrátí stav pending.

    Args:
        key: Klíč trackeru průběhu.
    """
    progress = get_image_progress(key)
    if progress is None:
        return ImageGenerationProgressResponse(
            step=0,
            total=IMAGE_GENERATION_TOTAL_STEPS,
            label="Čekání",
            status="pending",
        )
    return ImageGenerationProgressResponse(
        step=progress.step,
        total=progress.total,
        label=progress.label,
        status=progress.status,
        error=progress.error,
        result=progress.result,
    )


@router.post(
    "/generate-course-images",
    operation_id="generate_course_images",
    dependencies=[require_role("lector")],
)
async def generate_course_images(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> ImageGenerationProgressResponse:
    """Spustí generování coveru kurzu jako background task a vrátí se ihned.

    Obrázek generuje model z system_setting a ukládá se do SeaweedFS. Klient
    si průběh a výsledek sleduje pollingem ``/agents/course-image-progress/{course_id}``.
    """

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")

    return _start_image_generation("course", course_id)


@router.get(
    "/course-image-progress/{course_id}",
    operation_id="get_course_image_generation_progress",
    dependencies=[require_role("lector")],
)
async def get_course_image_generation_progress(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> ImageGenerationProgressResponse:
    """Vrátí průběh generování coveru kurzu; po dokončení i výsledek (cesta v SeaweedFS)."""

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")

    return _image_progress_response(progress_key("course", course_id))


@router.post(
    "/generate-module-images",
    operation_id="generate_module_images",
    dependencies=[require_role("lector")],
)
async def generate_module_images(
    module_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> ImageGenerationProgressResponse:
    """Spustí generování obrázku modulu jako background task a vrátí se ihned.

    Obrázek generuje model z system_setting a ukládá se do SeaweedFS. Klient
    si průběh a výsledek sleduje pollingem ``/agents/module-image-progress/{module_id}``.
    """

    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")
    validate_owner_or_superadmin(module, user, "modul")

    return _start_image_generation("module", module_id)


@router.get(
    "/module-image-progress/{module_id}",
    operation_id="get_module_image_generation_progress",
    dependencies=[require_role("lector")],
)
async def get_module_image_generation_progress(
    module_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> ImageGenerationProgressResponse:
    """Vrátí průběh generování obrázku modulu; po dokončení i výsledek (cesta v SeaweedFS)."""

    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")
    validate_owner_or_superadmin(module, user, "modul")

    return _image_progress_response(progress_key("module", module_id))


@router.get(
    "/active-image-generations",
    operation_id="list_active_image_generations",
    dependencies=[require_role("lector")],
)
async def list_active_image_generations(
    db: SessionSqlSessionDependency, user: CurrentUser
) -> list[ActiveImageGeneration]:
    """Vrátí právě běžící generování obrázků (kurzů i modulů), která přihlášený
    uživatel smí vidět (prázdný seznam, pokud žádné neběží).

    Superadmin vidí i cizí běžící generace, ostatní jen u svých kurzů.
    """
    candidates = list_running_image_ids()
    if not candidates:
        return []

    is_super = user.role == "superadmin"
    visible: list[ActiveImageGeneration] = []
    for key in candidates:
        kind, _, raw_id = key.partition(":")
        entity_id = int(raw_id)
        model = models.Course if kind == "course" else models.Module
        entity = db.get(model, entity_id)
        if entity is None:
            continue
        if is_super or entity.get_owner_id() == user.user_id:
            visible.append(ActiveImageGeneration(kind=kind, entity_id=entity_id))
    return visible


@router.post("/learn-blocks-chat", operation_id="learn_blocks_chat")
async def learn_blocks_chat(
    user_input: LearnBlocksChatRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> LearnBlocksChatResponse:
    """Endpoint pro chat s learn blockem."""

    learn_block = get_or_404(
        db, models.LearnBlock, user_input.learn_block_id, detail="Learn block nenalezen"
    )

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


@public_router.post("/wiki-chat", operation_id="wiki_chat")
async def wiki_chat(
    user_input: WikiChatRequest, db: SessionSqlSessionDependency
) -> WikiChatResponse:
    """Endpoint pro chat nad projektovou wiki."""

    service = WikiChatService(db=db, message=user_input.message)
    result = await service.chat()

    return WikiChatResponse(answer=result.answer)


@router.post(
    "/wiki-sync",
    operation_id="wiki_sync",
    dependencies=[require_role("superadmin")],
)
async def wiki_sync() -> WikiSyncResponse:
    """Endpoint pro ruční synchronizaci a re-indexaci GitHub wiki."""

    result = await sync_wiki()

    return WikiSyncResponse(pages_processed=result.pages_processed)


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

    # Odpověď se v testu musí napsat — nereálně rychle vzniklou odpověď
    # (vložený text) odmítneme dřív, než se pokus započítá a zavolá se AI.
    previous_attempts = [a for a in session.attempts if a.is_active]
    last_attempt = previous_attempts[-1] if previous_attempts else None
    if typed_too_fast(
        previous=last_attempt.user_response if last_attempt else "",
        current=body.user_response,
        since=last_attempt.created_at if last_attempt else session.created_at,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Odpověď vznikla rychleji, než je možné ji napsat. V testu je potřeba "
                "odpověď napsat vlastními slovy — pokus se nezapočítal."
            ),
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


@router.post(
    "/evaluate-open-question",
    operation_id="evaluate_open_question",
)
async def endp_evaluate_open_question(
    body: EvaluateOpenQuestionRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> OpenQuestionEvaluation:
    """Vyhodnotí odpověď na otevřenou otázku modulu. Nic neukládá."""
    return await evaluate_open_question_answer(
        db=db,
        question_id=body.question_id,
        user_input=body.user_input,
        user=user,
    )


@router.post(
    "/sql-agent-chat",
    operation_id="sql_agent_chat",
    dependencies=[require_role("superadmin")],
)
async def sql_agent_chat(
    user_input: str, db: SessionSqlSessionDependency, user: CurrentUser
) -> str:
    """Endpoint pro chat s SQL agentem."""
    service = SQLAgentService(
        db=db,
        user_input=user_input,
    )

    result: SQLAgentResult = await service.chat()
    return result.answer
