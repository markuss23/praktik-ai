from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.src.catalogs import schemas
from api.src.catalogs.controllers import get_course_blocks, get_course_subjects, get_course_targets

router = APIRouter(prefix="/catalogs", tags=["Catalogs"])


@router.get("/course-blocks", operation_id="list_course_blocks")
async def list_course_blocks(db: SessionSqlSessionDependency) -> list[schemas.CourseBlock]:
    return get_course_blocks(db)


@router.get("/course-targets", operation_id="list_course_targets")
async def list_course_targets(db: SessionSqlSessionDependency) -> list[schemas.CourseTarget]:
    return get_course_targets(db)


@router.get("/course-subjects", operation_id="list_course_subjects")
async def list_course_subjects(db: SessionSqlSessionDependency) -> list[schemas.CourseSubject]:
    return get_course_subjects(db)
