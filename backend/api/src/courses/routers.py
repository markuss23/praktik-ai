from typing import Literal

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.responses import Response
from langgraph.graph.state import CompiledStateGraph

from api.storage import seaweedfs
from api.src.common.utils import attachment_response, ensure_course_visible, get_or_404
from api import models

from api.dependencies import CurrentUser, OptionalUser, is_staff, require_role
from api.src.common.annotations import (
    COURSE_BLOCK_ID_ANNOTATION,
    COURSE_EQF_LEVEL_ID_ANNOTATION,
    COURSE_LEVEL_ID_ANNOTATION,
    COURSE_REQUIREMENT_ID_ANNOTATION,
    COURSE_STATUS_ANNOTATION,
    COURSE_SUBJECT_ID_ANNOTATION,
    COURSE_TARGET_ID_ANNOTATION,
    COURSE_TYPE_ID_ANNOTATION,
    INCLUDE_INACTIVE_ANNOTATION,
    IS_PUBLISHED_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)
from api.src.courses.schemas import (
    CourseCreate,
    CourseCreated,
    Course,
    CourseDetail,
    CourseUpdate,
    CourseFile,
    CourseImage,
    CourseLink,
)
from api.src.courses.controllers import (
    create_course,
    get_courses,
    get_course,
    get_course_files,
    get_recommended_courses,
    update_course,
    delete_course,
    upload_course_file,
    delete_course_file,
    create_course_link,
    get_course_links,
    delete_course_link,
    update_course_status,
    update_course_published,
    upload_course_image,
    delete_course_image,
    get_course_image,
)
from api.database import SessionLocal, SessionSqlSessionDependency
from agents.embedding_generator import create_graph as create_embedding_graph
from agents.embedding_generator.state import AgentState


router = APIRouter(prefix="/courses", tags=["Courses"])
public_router = APIRouter(prefix="/courses", tags=["Courses"])


# DŮLEŽITÉ: `/recommended` MUSÍ být zaregistrované před `/{course_id}` na
# public_routeru, protože `public_router` je v main routers.py includovaný
# dříve než auth `router`. Jinak FastAPI nejdřív matchne `/{course_id}`
# a pokusí se "recommended" konvertovat na int → 422.
# Auth se vyřeší přes `require_role("user")`, který interně pulluje
# `auth.get_current_user` (viz dependencies.py).
@public_router.get(
    "/recommended",
    operation_id="list_recommended_courses",
    dependencies=[require_role("user")],
)
async def endp_list_recommended_courses(
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    limit: int = 3,
) -> list[Course]:
    """Vrátí kurzy doporučené aktuálnímu uživateli — preferuje předměty,
    do nichž je již zapsán, tiebreaker je popularita. Vylučuje již zapsané."""
    return get_recommended_courses(db, user=user, limit=limit)


@public_router.get("", operation_id="list_courses")
async def list_courses(
    db: SessionSqlSessionDependency,
    user: OptionalUser,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    is_published: IS_PUBLISHED_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
    course_block_id: COURSE_BLOCK_ID_ANNOTATION = None,
    course_target_id: COURSE_TARGET_ID_ANNOTATION = None,
    course_subject_id: COURSE_SUBJECT_ID_ANNOTATION = None,
    course_requirement_id: COURSE_REQUIREMENT_ID_ANNOTATION = None,
    course_eqf_level_id: COURSE_EQF_LEVEL_ID_ANNOTATION = None,
    course_level_id: COURSE_LEVEL_ID_ANNOTATION = None,
    course_type_id: COURSE_TYPE_ID_ANNOTATION = None,
    status: COURSE_STATUS_ANNOTATION = None,
) -> list[Course]:
    # Nepřihlášení a studenti vidí jen publikované aktivní kurzy (koncepty ani
    # kurzy ve schvalování jim katalog nevrátí, ať pošlou jakékoli parametry).
    if not is_staff(user):
        is_published = True
        include_inactive = False
    return get_courses(
        db,
        include_inactive=include_inactive,
        is_published=is_published,
        text_search=text_search,
        course_block_id=course_block_id,
        course_target_id=course_target_id,
        course_subject_id=course_subject_id,
        course_requirement_id=course_requirement_id,
        course_eqf_level_id=course_eqf_level_id,
        course_level_id=course_level_id,
        course_type_id=course_type_id,
        status=status,
    )


@public_router.get("/{course_id}", operation_id="get_course_public")
async def endp_get_course_public(
    course_id: int, db: SessionSqlSessionDependency, user: OptionalUser
) -> CourseDetail:
    """Detail kurzu včetně obsahu modulů. Nepublikovaný kurz jen pro lektory+
    a zapsané studenty, ostatním 404 (viz `course_visible_to`)."""
    ensure_course_visible(db, course_id, user)
    return get_course(db, course_id)


@public_router.get(
    "/{course_id}/image/{filename}",
    operation_id="get_course_image",
    response_class=Response,
    responses={200: {"content": {"image/webp": {}}}},
)
async def endp_get_course_image(
    course_id: int, filename: str, db: SessionSqlSessionDependency
) -> Response:
    """Veřejný endpoint — náhled kurzu se zobrazuje jako <img src=...> bez auth hlaviček.

    Název souboru v URL je verze obrázku (viz `course_image_url`).
    """
    return get_course_image(db, course_id, filename)


@router.post("", operation_id="create_course", dependencies=[require_role("lector")])
async def endp_create_course(
    course: CourseCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> CourseCreated:
    return create_course(db, course, user)


@router.get("/{course_id}", operation_id="get_course")
async def endp_get_course(course_id: int, db: SessionSqlSessionDependency, user: CurrentUser) -> CourseDetail:
    ensure_course_visible(db, course_id, user)
    return get_course(db, course_id)


@router.put("/{course_id}", operation_id="update_course", dependencies=[require_role("lector")])
async def endp_update_course(
    course_id: int, course: CourseUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> Course:
    return update_course(db, course_id, course, user)


async def _generate_embeddings(course_id: int) -> None:
    """Background task: vygeneruje embeddingy pro kurz."""
    db: SessionSqlSessionDependency = SessionLocal()
    try:
        app: CompiledStateGraph[AgentState, None, AgentState, AgentState] = create_embedding_graph()
        await app.ainvoke({"course_id": course_id, "db": db})
    except Exception as e:
        print(f"Chyba při generování embeddingů pro kurz {course_id}: {e}")
    finally:
        db.close()


@router.put("/{course_id}/status", operation_id="update_course_status", dependencies=[require_role("lector")])
async def endp_update_course_status(
    course_id: int,
    status: Literal["edited", "in_review", "approved", "archived"],
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> Course:
    result = update_course_status(db, course_id, status, user)

    if status == "approved":
        background_tasks.add_task(_generate_embeddings, course_id)

    return result


@router.put("/{course_id}/published", operation_id="update_course_published", dependencies=[require_role("lector")])
async def endp_update_course_published(
    course_id: int,
    is_published: bool,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> Course:
    return update_course_published(db, course_id, is_published, user)


@router.delete("/{course_id}", operation_id="delete_course", status_code=204, dependencies=[require_role("lector")])
async def endp_delete_course(course_id: int, db: SessionSqlSessionDependency, user: CurrentUser) -> None:
    delete_course(db, course_id, user)


# ---------- File endpoints ----------


@router.post("/{course_id}/files", operation_id="upload_course_file", dependencies=[require_role("lector")])
async def endp_upload_course_file(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    file: UploadFile = File(...),  # noqa: B008
) -> CourseFile:
    """Nahraje soubor ke kurzu"""
    return await upload_course_file(db, course_id, file, user)


@router.get("/{course_id}/files", operation_id="list_course_files", dependencies=[require_role("lector")])
async def endp_list_course_files(
    course_id: int, db: SessionSqlSessionDependency
) -> list[CourseFile]:
    """Vrátí seznam podkladových souborů kurzu (pouze pro vlastníky/superadminy)."""
    return get_course_files(db, course_id)


@router.get(
    "/{course_id}/files/{file_id}/download",
    operation_id="download_course_file",
    dependencies=[require_role("lector")],
)
async def endp_download_course_file(
    course_id: int, file_id: int, db: SessionSqlSessionDependency
) -> Response:
    """Stáhne podkladový soubor kurzu ze SeaweedFS."""
    course_file = get_or_404(
        db,
        models.CourseFile,
        file_id,
        check_active=False,
        detail="Soubor nenalezen",
    )
    if course_file.course_id != course_id:
        raise HTTPException(status_code=404, detail="Soubor nenalezen")

    try:
        content = seaweedfs.download_file(course_file.file_path)
    except httpx.HTTPError as e:
        if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail="Soubor už není v úložišti"
            ) from e
        raise HTTPException(
            status_code=502, detail="Úložiště souborů je nedostupné"
        ) from e

    return attachment_response(content, course_file.filename)


@router.delete(
    "/{course_id}/files/{file_id}", operation_id="delete_course_file", status_code=204,
    dependencies=[require_role("lector")],
)
async def endp_delete_course_file(
    course_id: int, file_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    """Smaže soubor kurzu"""
    delete_course_file(db, course_id, file_id, user)


# ---------- Image endpoints ----------


@router.put("/{course_id}/image", operation_id="upload_course_image", dependencies=[require_role("lector")])
async def endp_upload_course_image(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    file: UploadFile = File(...),  # noqa: B008
) -> CourseImage:
    """Nahraje náhledový obrázek kurzu; uloží se jako 1280×720 WebP (ořez na střed do 16:9)."""
    return await upload_course_image(db, course_id, file, user)


@router.delete(
    "/{course_id}/image", operation_id="delete_course_image", status_code=204,
    dependencies=[require_role("lector")],
)
async def endp_delete_course_image(
    course_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    """Odebere náhledový obrázek, kurz se vrátí k výchozímu."""
    delete_course_image(db, course_id, user)


# ---------- Link endpoints ----------


@router.post("/{course_id}/links", operation_id="create_course_link", dependencies=[require_role("lector")])
async def endp_create_course_link(
    course_id: int,
    db: SessionSqlSessionDependency,
    url: str,
    user: CurrentUser,
) -> CourseLink:
    """Vytvoří odkaz ke kurzu"""
    return create_course_link(db, course_id, url, user)


@router.get("/{course_id}/links", operation_id="list_course_links")
async def endp_list_course_links(
    course_id: int,
    db: SessionSqlSessionDependency,
) -> list[CourseLink]:
    """Vrátí seznam odkazů ke kurzu"""
    return get_course_links(db, course_id)


@router.delete(
    "/{course_id}/links/{link_id}",
    operation_id="delete_course_link",
    status_code=204,
    dependencies=[require_role("lector")],
)
async def endp_delete_course_link(
    course_id: int, link_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    """Smaže odkaz kurzu"""
    delete_course_link(db, course_id, link_id, user)
