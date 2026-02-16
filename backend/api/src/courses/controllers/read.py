"""
Controllery pro čtení zdrojů kurzu.
"""

from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import Course, CourseFile, CourseLink


def get_courses(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    is_published: bool = False,
) -> list[Course]:
    """Vrátí seznam kurzů"""
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


def get_course(db: Session, course_id: int) -> Course:
    """Vrátí detail kurzu podle ID"""
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


def get_course_files(db: Session, course_id: int) -> list[CourseFile]:
    """Vrátí seznam souborů kurzu"""
    try:
        # Ověř, že kurz existuje
        course = (
            db.execute(
                select(models.Course).where(models.Course.course_id == course_id)
            )
            .scalars()
            .first()
        )

        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")

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

    except HTTPException:
        raise
    except Exception as e:
        print(f"get_course_files error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def get_course_links(db: Session, course_id: int) -> list[CourseLink]:
    """Vrátí seznam odkazů kurzu"""
    try:
        # Ověř, že kurz existuje
        course = (
            db.execute(
                select(models.Course).where(models.Course.course_id == course_id)
            )
            .scalars()
            .first()
        )

        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")

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

    except HTTPException:
        raise
    except Exception as e:
        print(f"get_course_links error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
