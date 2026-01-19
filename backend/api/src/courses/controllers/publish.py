"""
Controller pro změnu stavu publikování kurzu.
"""

from fastapi import HTTPException
from sqlalchemy import Select, select, update
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import Course


def toggle_course_publish(db: Session, course_id: int) -> Course:
    """Přepne stav publikování kurzu"""
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id,
            models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")

        # Přepnout is_published
        new_publish_state = not course.is_published

        stm = (
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(is_published=new_publish_state)
        )
        db.execute(stm)
        db.commit()
        db.refresh(course)

        return Course.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"toggle_course_publish error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
