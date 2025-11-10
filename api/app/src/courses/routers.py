from fastapi import APIRouter

from app.src.courses.schemas import CourseCreate
from app.src.courses.controllers import create_course, get_courses
from app.database import SessionSqlSessionDependency


router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("")
async def list_courses(db: SessionSqlSessionDependency):
    return get_courses(db)


@router.post("")
async def endp_create_course(course: CourseCreate, db: SessionSqlSessionDependency):
    return create_course(db, course)