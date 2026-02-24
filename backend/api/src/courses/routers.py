from typing import Literal
from fastapi import APIRouter, UploadFile, File

from api.dependencies import CurrentUser
from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    IS_PUBLISHED_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)
from api.src.courses.schemas import (
    CourseCreate,
    Course,
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
from api.database import SessionSqlSessionDependency
from api.enums import Status


router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", operation_id="list_courses")
async def list_courses(
    db: SessionSqlSessionDependency,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    is_published: IS_PUBLISHED_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
) -> list[Course]:
    return get_courses(
        db,
        include_inactive=include_inactive,
        is_published=is_published,
        text_search=text_search,
    )


@router.post("", operation_id="create_course")
async def endp_create_course(
    course: CourseCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> Course:
    return create_course(db, course, user)


@router.get("/{course_id}", operation_id="get_course")
async def endp_get_course(course_id: int, db: SessionSqlSessionDependency) -> Course:
    return get_course(db, course_id)


@router.put("/{course_id}", operation_id="update_course")
async def endp_update_course(
    course_id: int, course: CourseUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> Course:
    return update_course(db, course_id, course, user)


@router.put("/{course_id}/status", operation_id="update_course_status")
async def endp_update_course_status(
    course_id: int,
    status: Literal[Status.archived, Status.approved, Status.generated],
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> Course:
    return update_course_status(db, course_id, status, user)


@router.put("/{course_id}/published", operation_id="update_course_published")
async def endp_update_course_published(
    course_id: int,
    is_published: bool,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> Course:
    return update_course_published(db, course_id, is_published, user)


@router.delete("/{course_id}", operation_id="delete_course", status_code=204)
async def endp_delete_course(course_id: int, db: SessionSqlSessionDependency, user: CurrentUser) -> None:
    delete_course(db, course_id, user)


# ---------- File endpoints ----------


@router.post("/{course_id}/files", operation_id="upload_course_file")
async def endp_upload_course_file(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> CourseFile:
    """Nahraje soubor ke kurzu"""
    return await upload_course_file(db, course_id, file, user)


@router.delete(
    "/{course_id}/files/{file_id}", operation_id="delete_course_file", status_code=204
)
async def endp_delete_course_file(
    course_id: int, file_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    """Smaže soubor kurzu"""
    delete_course_file(db, course_id, file_id, user)


# ---------- Link endpoints ----------


@router.post("/{course_id}/links", operation_id="create_course_link")
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
)
async def endp_delete_course_link(
    course_id: int, link_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    """Smaže odkaz kurzu"""
    delete_course_link(db, course_id, link_id, user)
