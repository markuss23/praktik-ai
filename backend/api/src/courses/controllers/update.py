"""
Controllery pro editaci zdrojů kurzu.
"""

from fastapi import HTTPException
from sqlalchemy import Select, select, update
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import Course, CourseUpdate
from api.enums import Status


def update_course(db: Session, course_id: int, course_data: CourseUpdate) -> Course:
    """Aktualizuje existující kurz"""
    try:
        
        if db.execute(
            select(models.Category).where(
                models.Category.category_id == course_data.category_id,
                models.Category.is_active.is_(True),
            )
        ).first() is None:
            raise HTTPException(
                status_code=400, detail="Kategorie s tímto ID neexistuje"
            )
        
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id, models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")
        
        # tohle jsem si upravil, klidne jen pro ted v ramci testovani
        if course.status not in (Status.draft, Status.generated):
            raise HTTPException(
                status_code=400, detail="Lze upravovat pouze koncepty A vygenerované kurzy"
            )

        update_data = course_data.model_dump(exclude_unset=True)

        stm = (
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(**update_data)
        )
        db.execute(stm)
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_course error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e
    
    
def update_course_status(db: Session, course_id: int, status: Status) -> Course:
    """Aktualizuje status kurzu"""
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id, models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")
        
        if course.status == "generated" and status == "approved":
            pass
        elif course.status == "approved" and status == "archived":
            pass
        else:
            raise HTTPException(status_code=400, detail="Neplatná změna statusu kurzu")
    
        stm = (
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(status=status)
        )
        db.execute(stm)
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_course_status error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e
    
    
def update_course_published(db: Session, course_id: int, is_published: bool) -> Course:
    """Aktualizuje publikování kurzu"""
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id, models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")
        print(course.status)
        if course.status != Status.approved.value and course.status != Status.archived.value:
    
            raise HTTPException(
                status_code=400, detail="Nelze publikovat kurz, který není schválený"
            )

        stm = (
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(is_published=is_published)
        )
        db.execute(stm)
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_course_published error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e