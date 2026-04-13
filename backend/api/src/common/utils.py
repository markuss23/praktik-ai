from __future__ import annotations

from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session
from api import models

T = TypeVar("T")


def get_or_404(
    db: Session,
    model: type[T],
    pk_value: int,
    *,
    detail: str | None = None,
    check_active: bool = True,
) -> T:
    """Načte záznam podle primárního klíče, nebo vyhodí 404.

    Args:
        db: SQLAlchemy session
        model: ORM model class
        pk_value: hodnota primárního klíče
        detail: vlastní chybová hláška (výchozí: „{Model} nenalezen/a")
        check_active: přidat podmínku is_active=True (výchozí True)
    """
    pk_col = inspect(model).mapper.primary_key[0]
    stm = select(model).where(pk_col == pk_value)
    if check_active and hasattr(model, "is_active"):
        stm = stm.where(model.is_active.is_(True))
    result = db.scalars(stm).first()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=detail or f"{model.__name__} nenalezen/a",
        )
    return result


def assert_course_editable(course: models.Course) -> None:
    """Vyhodí 400 pokud kurz není v editovatelném stavu (draft/generated/edited)."""
    from api.enums import Status

    if course.status not in (Status.draft, Status.generated, Status.edited):
        raise HTTPException(
            status_code=400,
            detail="Editace je povolena pouze pokud je kurz ve stavu 'koncept', 'vygenerovaný' nebo 'editovaný'.",
        )


def check_enrollment(
    db: Session,
    user: models.User,
    course: models.Course,
    *,
    bypass_for_owner: bool = False,
) -> None:
    """Vyhodí 403 pokud uživatel není zapsán v kurzu.

    Args:
        bypass_for_owner: pokud True, vlastník kurzu a superadmin kontrolu přeskočí.
    """
    from api import models as m
    from api.enums import UserRole

    if bypass_for_owner:
        if user.user_id == course.owner_id or user.role == UserRole.superadmin:
            return

    enrollment = db.scalar(
        select(m.Enrollment).where(
            m.Enrollment.user_id == user.user_id,
            m.Enrollment.course_id == course.course_id,
            m.Enrollment.is_active.is_(True),
            m.Enrollment.left_at.is_(None),
        )
    )
    if enrollment is None:
        raise HTTPException(status_code=403, detail="Nejste zapsáni v tomto kurzu")
