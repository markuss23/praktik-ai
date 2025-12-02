from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, or_, select, update
from sqlalchemy.orm import Session

from app import models
from app.src.courses.schemas import CourseCreate
from app.src.courses.schemas import Course


def get_courses(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    is_published: bool = False,
) -> list[Course]:
    try:
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
    except Exception as e:
        print(f"get_courses error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def create_course(db: Session, course_data: CourseCreate) -> Course:
    try:
        if db.execute(
            select(models.Course).where(models.Course.title == course_data.title)
        ).first():
            raise HTTPException(
                status_code=400, detail="Kurz s tímto názvem již existuje"
            )

        course = models.Course(**course_data.model_dump())

        course.is_active = True

        db.add(course)
        db.commit()
        db.refresh(course)

        return course
    except HTTPException:
        raise
    except Exception as e:
        print(f"create_course error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def get_course(db: Session, course_id: int) -> Course:
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id
        )

        result: models.Course | None = db.execute(stm).scalars().first()

        if result is None:
            raise HTTPException(status_code=404, detail="Course not found")

        return Course.model_validate(result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_course error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def update_course(db: Session, course_id: int, course_data: CourseCreate) -> Course:
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")

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


def delete_course(db: Session, course_id: int) -> None:
    """
    Smaže kurz podle course_id (soft delete - nastaví is_active=False)
    """
    try:
        stm: Select[tuple[models.Course]] = select(models.Course).where(
            models.Course.course_id == course_id
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")

        # Soft delete - nastavíme is_active na False
        course.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_course error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e
