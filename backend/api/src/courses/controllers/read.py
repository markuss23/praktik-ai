"""
Controllery pro čtení zdrojů kurzu.
"""

from collections.abc import Sequence

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.src.common.utils import get_or_404
from api.src.courses.schemas import Course, CourseDetail, CourseFile, CourseLink


def get_courses(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    is_published: bool = False,
    course_block_id: int | None = None,
    course_target_id: int | None = None,
    course_subject_id: int | None = None,
    status: str | None = None,
) -> list[Course]:
    """Vrátí seznam kurzů. Doplňuje agregovaný počet aktivních zápisů a třídí
    od nejvíce zapsaného (pomáhá frontendu řadit „nejoblíbenější první")."""

    enrollment_count_subq = (
        select(
            models.Enrollment.course_id.label("course_id"),
            func.count(models.Enrollment.enrollment_id).label("cnt"),
        )
        .where(models.Enrollment.is_active.is_(True))
        .group_by(models.Enrollment.course_id)
        .subquery()
    )
    enrollments_count_col = func.coalesce(enrollment_count_subq.c.cnt, 0).label(
        "enrollments_count"
    )

    stm: Select[tuple[models.Course, int]] = (
        select(models.Course, enrollments_count_col)
        .outerjoin(
            enrollment_count_subq,
            models.Course.course_id == enrollment_count_subq.c.course_id,
        )
        .options(joinedload(models.Course.owner))
        .order_by(enrollments_count_col.desc(), models.Course.course_id.asc())
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

    if course_block_id is not None:
        stm = stm.where(models.Course.course_block_id == course_block_id)

    if course_target_id is not None:
        stm = stm.where(models.Course.course_target_id == course_target_id)

    if course_subject_id is not None:
        stm = stm.where(models.Course.course_subject_id == course_subject_id)

    if status is not None:
        stm = stm.where(models.Course.status == status)

    rows: Sequence[tuple[models.Course, int]] = db.execute(stm).all()
    result: list[Course] = []
    for course, cnt in rows:
        course.__dict__["enrollments_count"] = int(cnt or 0)
        result.append(Course.model_validate(course))
    return result


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
