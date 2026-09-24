from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.src.catalogs import schemas
from api.src.catalogs.controllers import (
    get_course_blocks,
    get_course_eqf_levels,
    get_course_requirements,
    get_course_subjects,
    get_course_targets,
    get_course_types,
)

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


@router.get("/course-requirements", operation_id="list_course_requirements")
async def list_course_requirements(db: SessionSqlSessionDependency) -> list[schemas.CourseRequirement]:
    return get_course_requirements(db)


@router.get("/course-eqf-levels", operation_id="list_course_eqf_levels")
async def list_course_eqf_levels(db: SessionSqlSessionDependency) -> list[schemas.CourseEqfLevel]:
    return get_course_eqf_levels(db)


@router.get("/course-types", operation_id="list_course_types")
async def list_course_types(db: SessionSqlSessionDependency) -> list[schemas.CourseType]:
    return get_course_types(db)
