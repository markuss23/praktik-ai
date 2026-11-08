import asyncio
import base64

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import update
from sqlalchemy.orm import Session

from api.dependencies import CurrentUser, require_role
from api.authorization import validate_owner_or_superadmin
from api.src.common.utils import assert_course_editable, get_or_404, check_enrollment
from api.src.agents.schemas import (
    ActiveImageGeneration,
    CourseGenerationProgressResponse,
    GenerateCourseResponse,
    GenerateEmbeddingsResponse,
    GenerateImageResponse,
    ImageGenerationProgressResponse,
    LearnBlocksChatRequest,
    LearnBlocksChatResponse,
    WikiChatRequest,
    WikiChatResponse,
    WikiSyncResponse,
)
from api.src.agents.progress import (
    course_key,
    get_progress,
    image_key,
    list_running_keys,
    mark_completed,
    mark_failed,
    register_task,
    run_tracked,
    set_progress,
    try_start,
    unregister_task,
)
from api.database import SessionLocal
from api.src.courses.controllers.image import normalize_course_image, store_course_image
from api.storage import seaweedfs
from agents.course_generator.service import CourseGeneratorService
from agents.embedding_generator.service import EmbeddingGeneratorService
from agents.image_generator.course.service import CourseImageGeneratorService
from agents.image_generator.module.service import ModuleImageGeneratorService
from agents.image_generator.service import ImageGenerationResult
from agents.mentor.service import MentorService
from agents.wiki.mentor.service import WikiChatService
from agents.wiki.agent.service import sync_wiki
from api.database import SessionSqlSessionDependency
from api import models
from api.enums import MentorScope

# Kroky obrázku: 1 kontext z DB, 2 prompt (LLM), 3 image model, 4 uložení do SeaweedFS.
IMAGE_GENERATION_TOTAL_STEPS = 4

router = APIRouter(prefix="/agents", tags=["agents"])
# Bez autentizace — wiki chat je nápověda pro všechny návštěvníky
public_router = APIRouter(prefix="/agents", tags=["agents"])


async def _run_course_generation(course_id: int) -> None:
    """Background task: spustí CourseGeneratorService s vlastní DB session.

    Běží nezávisle na původním HTTP requestu, takže refresh stránky
    klienta generování nepřeruší. Stav je dostupný přes
    ``/agents/course-progress/{course_id}``.
    """
    key = course_key(course_id)
    db = SessionLocal()
    try:
        service = CourseGeneratorService(db=db, course_id=course_id)
        try:
            await run_tracked(key, service.generate())
        except Exception as e:  # noqa: BLE001 — chceme zachytit cokoliv
            mark_failed(key, str(e))
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
        mark_completed(key)
    finally:
        db.close()
        unregister_task(key)


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
            status_code=400,
            detail="Lze generovat pouze pokud kurz je ve stavu draft nebo failed",
        )

    # Idempotence: pokud už pro tento kurz generování běží (v jakémkoliv workeru),
    # nic nespouštěj (klient se připojí přes progress endpoint).
    if try_start(course_key(course_id), total=5):
        task = asyncio.create_task(_run_course_generation(course_id))
        register_task(course_key(course_id), task)

    return GenerateCourseResponse(title=course.title)


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

    progress = get_progress(course_key(course_id))
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
    candidates = list_running_keys("course:")
    if not candidates:
        return []

    is_super = user.role == "superadmin"
    visible: list[int] = []
    for key in candidates:
        course_id = int(key.partition(":")[2])
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


async def _save_generated_course_image(
    db: Session, course_id: int, result: ImageGenerationResult
) -> GenerateImageResponse:
    """Uloží vygenerovaný cover a rovnou ho nastaví kurzu jako náhledový obrázek.

    Projde stejnou normalizací jako nahraný obrázek (1280×720 WebP), takže
    v kartách sedí rozměry bez ohledu na to, co image model vrátil.
    """
    image = result.result
    _, b64_data = image.image_url.split(",", 1)
    normalized = await asyncio.to_thread(
        normalize_course_image, base64.b64decode(b64_data)
    )
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    # Kurz mohl být během generování odeslán ke schválení — pak obrázek nepřepisovat
    assert_course_editable(course)
    file_path = store_course_image(db, course, normalized)

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
        key: Klíč trackeru průběhu (``image_key(kind, entity_id)``).
        kind: "course" nebo "module".
        entity_id: course_id, resp. module_id.
    """
    db = SessionLocal()
    try:
        set_progress(key, step=1, label="Načítání kontextu z databáze")
        if kind == "course":
            service = CourseImageGeneratorService(
                db=db, course_id=entity_id, progress_key=key
            )
        else:
            service = ModuleImageGeneratorService(
                db=db, module_id=entity_id, progress_key=key
            )

        result = await run_tracked(key, service.generate())

        set_progress(key, step=4, label="Ukládání obrázku do SeaweedFS")
        if kind == "course":
            response = await _save_generated_course_image(db, entity_id, result)
        else:
            response = _upload_image_to_seaweedfs(
                result, remote_dir=f"module-images/{entity_id}", basename="image"
            )
        mark_completed(key, response.model_dump())
    except Exception as e:  # noqa: BLE001 — chceme zachytit cokoliv
        mark_failed(key, str(e))
    finally:
        db.close()
        unregister_task(key)


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
    key = image_key(kind, entity_id)

    if try_start(key, total=IMAGE_GENERATION_TOTAL_STEPS):
        task = asyncio.create_task(_run_image_generation(key, kind, entity_id))
        register_task(key, task)

    return _image_progress_response(key)


def _image_progress_response(key: str) -> ImageGenerationProgressResponse:
    """Převede záznam trackeru na response; bez záznamu vrátí stav pending.

    Args:
        key: Klíč trackeru průběhu.
    """
    progress = get_progress(key)
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

    Obrázek generuje model z system_setting, ukládá se do SeaweedFS jako 1280×720
    WebP a po dokončení se rovnou nastaví jako náhledový obrázek kurzu. Klient
    si průběh a výsledek sleduje pollingem ``/agents/course-image-progress/{course_id}``.
    """

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")
    # Vygenerovaný cover se rovnou nastaví kurzu — jen v editovatelném stavu
    assert_course_editable(course)

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

    return _image_progress_response(image_key("course", course_id))


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

    return _image_progress_response(image_key("module", module_id))


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
    candidates = list_running_keys("course-image:", "module-image:")
    if not candidates:
        return []

    is_super = user.role == "superadmin"
    visible: list[ActiveImageGeneration] = []
    for key in candidates:
        prefix, _, raw_id = key.partition(":")
        kind = prefix.removesuffix("-image")
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
    use_history: bool = Query(True, description="Použít předchozí konverzaci"),
    scope: MentorScope = Query(  # noqa: B008
        MentorScope.module,
        description="Kde hledat podklady a historii: v learn blocku/modulu, nebo v celém kurzu",
    ),
) -> LearnBlocksChatResponse:
    """Chat s AI mentorem. scope=module potřebuje learn_block_id, scope=course stačí course_id."""

    if user_input.learn_block_id is not None:
        learn_block = get_or_404(
            db, models.LearnBlock, user_input.learn_block_id, detail="Learn block nenalezen"
        )
        course = learn_block.module.course
        if user_input.course_id not in (None, course.course_id):
            raise HTTPException(status_code=400, detail="Learn block nepatří do kurzu")
    elif scope == MentorScope.course and user_input.course_id is not None:
        course = get_or_404(db, models.Course, user_input.course_id, detail="Kurz nenalezen")
    else:
        raise HTTPException(
            status_code=400,
            detail="Chybí learn_block_id (pro scope=course stačí course_id)",
        )

    if not (course.is_active and course.status in ("approved", "archived")):
        raise HTTPException(
            status_code=400, detail="Chat je jen v aktivním a schváleném kurzu"
        )

    # Owner and superadmin can use the tutor without enrollment
    check_enrollment(db, user, course, bypass_for_owner=True)

    service = MentorService(
        db=db,
        course_id=course.course_id,
        learn_block_id=user_input.learn_block_id,
        user_id=user.user_id,
        message=user_input.message,
        use_history=use_history,
        scope=scope,
    )

    result = await service.chat()

    log = models.MentorInteractionLog(
        user_id=user.user_id,
        course_id=course.course_id,
        learn_id=user_input.learn_block_id,
        scope=scope,
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
