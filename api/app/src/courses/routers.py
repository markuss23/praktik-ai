from fastapi import APIRouter

from app.src.courses.schemas import CourseCreate, Course
from app.src.courses.controllers import create_course, get_courses
from app.database import SessionSqlSessionDependency


router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", operation_id="list_courses")
async def list_courses(db: SessionSqlSessionDependency) -> list[Course]:
    return get_courses(db)


@router.post("", operation_id="create_course")
async def endp_create_course(course: CourseCreate, db: SessionSqlSessionDependency) -> Course:
    return create_course(db, course)