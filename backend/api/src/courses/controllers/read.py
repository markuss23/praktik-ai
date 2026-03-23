"""
Controllery pro čtení zdrojů kurzu.
"""

from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.src.courses.schemas import Course, CourseDetail, CourseFile, CourseLink


def get_courses(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    is_published: bool = False,
) -> list[Course]:
    """Vrátí seznam kurzů"""
    stm: Select[tuple[models.Course]] = select(models.Course).order_by(
        models.Course.course_id
    )

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


def get_course(db: Session, course_id: int) -> CourseDetail:
    """Vrátí detail kurzu podle ID"""
    course = get_or_404(db, models.Course, course_id, check_active=False)
    return CourseDetail.model_validate(course)


def get_course_files(db: Session, course_id: int) -> list[CourseFile]:
    """Vrátí seznam souborů kurzu"""
    get_or_404(db, models.Course, course_id, check_active=False)

    files = (
        db.execute(
            select(models.CourseFile).where(
                models.CourseFile.course_id == course_id
            )
        )
        .scalars()
        .all()
    )

    return [CourseFile.model_validate(f) for f in files]


def get_course_links(db: Session, course_id: int) -> list[CourseLink]:
    """Vrátí seznam odkazů kurzu"""
    get_or_404(db, models.Course, course_id, check_active=False)

    links = (
        db.execute(
            select(models.CourseLink).where(
                models.CourseLink.course_id == course_id
            )
        )
        .scalars()
        .all()
    )

    return [CourseLink.model_validate(r) for r in links]
