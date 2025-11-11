from fastapi import APIRouter

from app.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    IS_PUBLISHED_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)
from app.src.courses.schemas import CourseCreate, Course, CourseUpdate
from app.src.courses.controllers import (
    create_course,
    get_courses,
    get_course,
    update_course,
)
from app.database import SessionSqlSessionDependency


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
    course: CourseCreate, db: SessionSqlSessionDependency
) -> Course:
    return create_course(db, course)


@router.get("/{course_id}", operation_id="get_course")
async def endp_get_course(course_id: int, db: SessionSqlSessionDependency) -> Course:
    return get_course(db, course_id)


@router.put("/{course_id}", operation_id="update_course")
async def endp_update_course(
    course_id: int, course: CourseUpdate, db: SessionSqlSessionDependency
) -> Course:
    return update_course(db, course_id, course)
