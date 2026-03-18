from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api import models
from api.enums import Status, UserRole, ModuleTaskSessionStatus
from api.src.enrollments.schemas import Enrollment, MyEnrollment, MyEnrollmentCourse


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
        # Regular users can only enroll themselves; admin/superadmin can enroll anyone
        if actor.role not in (UserRole.guarantor, UserRole.superadmin) and actor.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Můžete zapsat pouze sami sebe",
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


def my_enrollments(db: Session, user: models.User) -> list[MyEnrollment]:
    """
    Vrátí zápisy aktuálního uživatele s progress informacemi.
    """
    try:
        enrollments = db.execute(
            select(models.Enrollment).where(
                models.Enrollment.user_id == user.user_id,
                models.Enrollment.is_active.is_(True),
                models.Enrollment.left_at.is_(None),
            )
        ).scalars().all()

        result: list[MyEnrollment] = []
        for enrollment in enrollments:
            course = enrollment.course
            if not course or not course.is_active:
                continue

            # Count total active modules
            total_modules = sum(1 for m in course.modules if m.is_active)

            # Count passed modules (user has at least one passed task session)
            passed_modules = 0
            for module in course.modules:
                if not module.is_active:
                    continue
                has_passed = db.scalar(
                    select(func.count()).select_from(models.ModuleTaskSession).where(
                        models.ModuleTaskSession.user_id == user.user_id,
                        models.ModuleTaskSession.module_id == module.module_id,
                        models.ModuleTaskSession.status == ModuleTaskSessionStatus.passed,
                    )
                )
                if has_passed and has_passed > 0:
                    passed_modules += 1

            result.append(MyEnrollment(
                enrollment_id=enrollment.enrollment_id,
                course_id=course.course_id,
                course=MyEnrollmentCourse(
                    course_id=course.course_id,
                    title=course.title,
                    description=course.description,
                    modules_count=total_modules,
                ),
                completed_modules=passed_modules,
                total_modules=total_modules,
                enrolled_at=enrollment.created_at,
                completed_at=enrollment.completed_at,
            ))

        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"my_enrollments error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e


def leave_enrollment(db: Session, enrollment_id: int, user: models.User) -> None:
    """Uživatel se sám odepíše z kurzu."""
    try:
        enrollment = _get_enrollment_or_404(db, enrollment_id)

        if enrollment.user_id != user.user_id:
            raise HTTPException(status_code=403, detail="Můžete opustit pouze vlastní zápis")

        if enrollment.left_at is not None:
            raise HTTPException(status_code=400, detail="Kurz jste již opustili")

        enrollment.left_at = func.now()
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"leave_enrollment error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e
