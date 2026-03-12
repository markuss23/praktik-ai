from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api import models
from api.enums import Status, UserRole
from api.src.enrollments.schemas import Enrollment


def _get_enrollment_or_404(db: Session, enrollment_id: int) -> models.Enrollment:
    enrollment = db.scalar(
        select(models.Enrollment).where(
            models.Enrollment.enrollment_id == enrollment_id
        )
    )
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Zápis nenalezen")
    return enrollment


def list_enrollments(
    db: Session,
    actor: models.User,
    course_id: int | None = None,
    user_id: int | None = None,
    include_inactive: bool = False,
) -> list[Enrollment]:
    """
    Vrátí seznam zápisů, volitelně filtrovaný podle kurzu nebo uživatele.
    Endpoint zamčený přes require_role("lector").
    include_inactive je povoleno pouze pro superadmina.
    """
    try:
        stm = select(models.Enrollment).order_by(models.Enrollment.enrollment_id)

        if include_inactive and actor.role != UserRole.superadmin:
            raise HTTPException(
                status_code=403,
                detail="Pouze superadmin může zobrazit neaktivní zápisy",
            )

        if not include_inactive:
            stm = stm.where(models.Enrollment.is_active.is_(True))

        if course_id is not None:
            stm = stm.where(models.Enrollment.course_id == course_id)
        if user_id is not None:
            stm = stm.where(models.Enrollment.user_id == user_id)
        rows = db.execute(stm).scalars().all()
        return [Enrollment.model_validate(e) for e in rows]
    except HTTPException:
        raise
    except Exception as e:
        print(f"list_enrollments error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e


def create_enrollment(
    db: Session,
    user_id: int,
    course_id: int,
    actor: models.User,
) -> Enrollment:
    """
    Zapíše uživatele do kurzu.
    Běžný uživatel může zapsat pouze sebe.
    Admin/superadmin může zapsat kohokoliv.
    """
    try:
        if actor.user_id == user_id:
            raise HTTPException(
                status_code=400,
                detail="Nelze zapsat sám sebe do kurzu",
            )

        course = db.scalar(
            select(models.Course).where(
                models.Course.course_id == course_id,
                models.Course.is_active.is_(True),
            )
        )
        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")

        if not course.is_published or course.status != Status.approved:
            raise HTTPException(
                status_code=400,
                detail="Kurz není publikovaný nebo schválený, nelze se zapsat",
            )

        user = db.scalar(
            select(models.User).where(
                models.User.user_id == user_id,
                models.User.is_active.is_(True),
            )
        )
        if user is None:
            raise HTTPException(status_code=404, detail="Uživatel nenalezen")

        existing = db.scalar(
            select(models.Enrollment).where(
                models.Enrollment.user_id == user_id,
                models.Enrollment.course_id == course_id,
            )
        )
        if existing is not None:
            raise HTTPException(status_code=409, detail="Uživatel je již zapsán do tohoto kurzu")

        enrollment = models.Enrollment(user_id=user_id, course_id=course_id)
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return Enrollment.model_validate(enrollment)
    except HTTPException:
        raise
    except Exception as e:
        print(f"create_enrollment error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e


def delete_enrollment(
    db: Session,
    enrollment_id: int,
    actor: models.User,
) -> None:
    """
    Vyřadí uživatele z kurzu (nastaví left_at).
    Endpoint je zamčený přes require_role("lector").
    """
    try:
        enrollment = _get_enrollment_or_404(db, enrollment_id)

        if enrollment.left_at is not None:
            raise HTTPException(
                status_code=400,
                detail="Uživatel byl již z kurzu vyřazen",
            )

        enrollment.left_at = func.now()
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_enrollment error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e


def soft_delete_enrollment(
    db: Session,
    enrollment_id: int,
) -> None:
    """
    Soft-delete zápisu (is_active = False).
    Endpoint zamčený přes require_role("superadmin").
    """
    try:
        enrollment = _get_enrollment_or_404(db, enrollment_id)

        if not enrollment.is_active:
            raise HTTPException(
                status_code=400,
                detail="Zápis je již deaktivovaný",
            )

        enrollment.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"soft_delete_enrollment error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e
