"""
Controllery pro editaci zdrojů kurzu.
"""

from fastapi import HTTPException
from sqlalchemy import Select, select, update
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import Course, CourseCreate
from api.enums import Status


def update_course(db: Session, course_id: int, course_data: CourseCreate) -> Course:
    """Aktualizuje existující kurz"""
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id,
            models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")

        if course.status != Status.draft:
            raise HTTPException(
                status_code=400, detail="Lze upravit pouze koncepty kurzů"
            )

        stm = (
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(**course_data.model_dump())
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
