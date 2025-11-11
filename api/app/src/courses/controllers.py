from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app import models
from app.src.courses.schemas import CourseCreate
from app.src.courses.schemas import Course


def get_courses(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    is_published: bool = False,
) -> list[Course]:
    stm: Select[tuple[models.Course]] = select(models.Course)

    if not include_inactive:
        stm = stm.where(models.Course.is_active.is_(True))

    if is_published:
        stm = stm.where(models.Course.is_published.is_(True))

    if text_search:
        stm = stm.where(
            or_(
                models.Course.title.ilike(f"%{text_search}%"),
                models.Course.description.ilike(f"%{text_search}%"),
            )
        )

    rows: Sequence[Course] = db.execute(stm).scalars().all()
    return [Course.model_validate(c) for c in rows]


def create_course(db: Session, course_data: CourseCreate) -> Course:
    course = models.Course(**course_data.model_dump())

    db.add(course)
    db.commit()
    db.refresh(course)

    return course


def get_course(db: Session, course_id: int) -> Course:
    stm: Select[tuple[models.Course]] = select(models.Course).where(
        models.Course.course_id == course_id
    )

    result: models.Course | None = db.execute(stm).scalars().first()

    if result is None:
        raise HTTPException(status_code=404, detail="Course not found")

    return Course.model_validate(result)


def update_course(db: Session, course_id: int, course_data: CourseCreate) -> Course:
    stm: Select[tuple[models.Course]] = select(models.Course).where(
        models.Course.course_id == course_id
    )

    course: models.Course | None = db.execute(stm).scalars().first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    for key, value in course_data.model_dump().items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)

    return Course.model_validate(course)
