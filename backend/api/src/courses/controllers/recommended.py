"""Controller pro doporučené kurzy uživateli."""

from sqlalchemy import case, func, literal, select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.enums import Status
from api.src.courses.schemas import Course


def get_recommended_courses(
    db: Session,
    user: models.User,
    limit: int = 3,
) -> list[Course]:
    """
    Doporučí publikované a schválené kurzy, do kterých uživatel ještě
    není zapsán.

    Personalizace: kurzy ze stejných předmětů (course_subject_id), do
    kterých uživatel zapsán je, dostávají boost. Tiebreaker je popularita
    (počet aktivních zápisů).
    """
    limit = max(1, min(limit, 24))

    # Předměty, do kterých user už je zapsán → boost pro doporučení
    enrolled_subject_ids: set[int] = set(
        sid for sid in db.execute(
            select(models.Course.course_subject_id)
            .join(models.Enrollment, models.Enrollment.course_id == models.Course.course_id)
            .where(
                models.Enrollment.user_id == user.user_id,
                models.Enrollment.is_active.is_(True),
                models.Enrollment.left_at.is_(None),
                models.Course.course_subject_id.is_not(None),
            )
            .distinct()
        ).scalars()
        if sid is not None
    )

    # Kurzy, do kterých už je uživatel zapsán → vyloučit
    enrolled_course_ids = set(
        db.execute(
            select(models.Enrollment.course_id).where(
                models.Enrollment.user_id == user.user_id,
                models.Enrollment.is_active.is_(True),
                models.Enrollment.left_at.is_(None),
            )
        ).scalars()
    )

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

    # Score: same-subject boost + popularity
    if enrolled_subject_ids:
        subject_boost = case(
            (models.Course.course_subject_id.in_(enrolled_subject_ids), 1000),
            else_=0,
        )
    else:
        subject_boost = literal(0)
    score_col = (subject_boost + enrollments_count_col).label("score")

    stm = (
        select(models.Course, enrollments_count_col, score_col)
        .outerjoin(
            enrollment_count_subq,
            models.Course.course_id == enrollment_count_subq.c.course_id,
        )
        .options(joinedload(models.Course.owner))
        .where(
            models.Course.is_active.is_(True),
            models.Course.is_published.is_(True),
            models.Course.status == Status.approved,
        )
        .order_by(score_col.desc(), models.Course.course_id.asc())
    )

    if enrolled_course_ids:
        stm = stm.where(~models.Course.course_id.in_(enrolled_course_ids))

    rows = db.execute(stm.limit(limit)).all()
    result: list[Course] = []
    for course, cnt, _score in rows:
        course.__dict__["enrollments_count"] = int(cnt or 0)
        result.append(Course.model_validate(course))
    return result
