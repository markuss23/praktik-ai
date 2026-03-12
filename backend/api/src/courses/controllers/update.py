"""
Controllery pro editaci zdrojů kurzu.
"""

from fastapi import HTTPException
from sqlalchemy import Select, select, update
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import Course, CourseUpdate
from api.enums import Status, UserRole
from api.authorization import validate_ownership


def update_course(db: Session, course_id: int, course_data: CourseUpdate, user: models.User) -> Course:
    """Aktualizuje existující kurz (v draft nebo generated stavu)"""
    try:
        if db.execute(
            select(models.CourseBlock).where(
                models.CourseBlock.block_id == course_data.course_block_id,
                models.CourseBlock.is_active.is_(True),
            )
        ).first() is None:
            raise HTTPException(status_code=400, detail="Tematický blok s tímto ID neexistuje")

        if db.execute(
            select(models.CourseTarget).where(
                models.CourseTarget.target_id == course_data.course_target_id,
                models.CourseTarget.is_active.is_(True),
            )
        ).first() is None:
            raise HTTPException(status_code=400, detail="Cílová skupina s tímto ID neexistuje")

        if course_data.course_subject_id is not None and db.execute(
            select(models.CourseSubject).where(
                models.CourseSubject.subject_id == course_data.course_subject_id,
                models.CourseSubject.is_active.is_(True),
            )
        ).first() is None:
            raise HTTPException(status_code=400, detail="Obor s tímto ID neexistuje")

        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id, models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")

        validate_ownership(course, user, "kurz")

        if course.status not in (Status.draft, Status.generated):
            raise HTTPException(
                status_code=400, detail="Lze upravovat pouze koncepty a vygenerované kurzy"
            )

        update_data = course_data.model_dump(exclude_unset=True)

        db.execute(
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(**update_data)
        )
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_course error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_course_status(db: Session, course_id: int, status: Status, user: models.User) -> Course:
    """Aktualizuje status kurzu"""
    try:
        course: models.Course | None = db.execute(
            select(models.Course).where(
                models.Course.course_id == course_id, models.Course.is_active.is_(True)
            )
        ).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")

        if user.role not in (UserRole.guarantor, UserRole.superadmin):
            validate_ownership(course, user, "kurz")

        valid_transitions = {
            Status.generated: {Status.edited},
            Status.edited: {Status.in_review},
            Status.in_review: {Status.approved, Status.edited},
            Status.approved: {Status.archived},
        }

        allowed = valid_transitions.get(course.status, set())
        if status not in allowed:
            raise HTTPException(status_code=400, detail="Neplatná změna statusu kurzu")

        db.execute(
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(status=status)
        )
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_course_status error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_course_published(db: Session, course_id: int, is_published: bool, user: models.User) -> Course:
    """Aktualizuje publikování kurzu"""
    try:
        course: models.Course | None = db.execute(
            select(models.Course).where(
                models.Course.course_id == course_id, models.Course.is_active.is_(True)
            )
        ).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")

        validate_ownership(course, user, "kurz")

        # approved: lze pouze publikovat (false → true)
        if course.status == Status.approved:
            if not is_published:
                raise HTTPException(status_code=400, detail="Kurz ve stavu 'approved' lze pouze publikovat.")
            if course.is_published:
                raise HTTPException(status_code=400, detail="Kurz je již publikován.")
        # archived: lze pouze zrušit publikování (true → false)
        elif course.status == Status.archived:
            if is_published:
                raise HTTPException(status_code=400, detail="Archivovaný kurz nelze publikovat.")
            if not course.is_published:
                raise HTTPException(status_code=400, detail="Kurz již není publikován.")
        else:
            raise HTTPException(status_code=400, detail="Publikování lze měnit pouze u kurzu ve stavu 'approved' nebo 'archived'.")

        db.execute(
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(is_published=is_published)
        )
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_course_published error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
