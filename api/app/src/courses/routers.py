from fastapi import APIRouter

from app.src.courses.schemas import CourseCreate, Course
from app.src.courses.controllers import (
    create_course,
    get_courses,
    get_course,
    update_course,
)
from app.database import SessionSqlSessionDependency


router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", operation_id="list_courses")
async def list_courses(db: SessionSqlSessionDependency) -> list[Course]:
    return get_courses(db)


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
    course_id: int, course: CourseCreate, db: SessionSqlSessionDependency
) -> Course:
    return update_course(db, course_id, course)
