from typing import Literal
from fastapi import APIRouter, BackgroundTasks, UploadFile, File
from langgraph.graph.state import CompiledStateGraph

from api.dependencies import CurrentUser, require_role
from api.src.common.annotations import (
    COURSE_BLOCK_ID_ANNOTATION,
    COURSE_STATUS_ANNOTATION,
    COURSE_SUBJECT_ID_ANNOTATION,
    COURSE_TARGET_ID_ANNOTATION,
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
    CourseLink,
)
from api.src.courses.controllers import (
    create_course,
    get_courses,
    get_course,
    update_course,
    delete_course,
    upload_course_file,
    delete_course_file,
    create_course_link,
    get_course_links,
    delete_course_link,
    update_course_status,
    update_course_published,
)
from api.database import SessionLocal, SessionSqlSessionDependency
from agents.embedding_generator import create_graph as create_embedding_graph
from agents.embedding_generator.state import AgentState


router = APIRouter(prefix="/courses", tags=["Courses"])
public_router = APIRouter(prefix="/courses", tags=["Courses"])


@public_router.get("", operation_id="list_courses")
async def list_courses(
    db: SessionSqlSessionDependency,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    is_published: IS_PUBLISHED_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
    course_block_id: COURSE_BLOCK_ID_ANNOTATION = None,
    course_target_id: COURSE_TARGET_ID_ANNOTATION = None,
    course_subject_id: COURSE_SUBJECT_ID_ANNOTATION = None,
    status: COURSE_STATUS_ANNOTATION = None,
) -> list[Course]:
    return get_courses(
        db,
        include_inactive=include_inactive,
        is_published=is_published,
        text_search=text_search,
        course_block_id=course_block_id,
        course_target_id=course_target_id,
        course_subject_id=course_subject_id,
        status=status,
    )


@public_router.get("/{course_id}", operation_id="get_course_public")
async def endp_get_course_public(course_id: int, db: SessionSqlSessionDependency) -> CourseDetail:
    return get_course(db, course_id)


@router.post("", operation_id="create_course", dependencies=[require_role("lector")])
async def endp_create_course(
    course: CourseCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> CourseCreated:
    return create_course(db, course, user)


@router.get("/{course_id}", operation_id="get_course")
async def endp_get_course(course_id: int, db: SessionSqlSessionDependency) -> CourseDetail:
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
    file: UploadFile = File(...),
) -> CourseFile:
    """Nahraje soubor ke kurzu"""
    return await upload_course_file(db, course_id, file, user)


@router.delete(
    "/{course_id}/files/{file_id}", operation_id="delete_course_file", status_code=204,
    dependencies=[require_role("lector")],
)
async def endp_delete_course_file(
    course_id: int, file_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    """Smaže soubor kurzu"""
    delete_course_file(db, course_id, file_id, user)


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
