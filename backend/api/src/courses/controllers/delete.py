"""
Controllery pro mazání zdrojů kurzu.
"""

from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.enums import Status
from api.authorization import validate_ownership


def delete_course(db: Session, course_id: int, user: dict) -> None:
    """
    Smaže kurz podle course_id (soft delete - nastaví is_active=False)
    """
    try:
        stm = select(models.Course).where(
            models.Course.course_id == course_id,
            models.Course.is_active.is_(True)
        )

        course: models.Course | None = db.execute(stm).scalars().first()

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")
        
        # Validace vlastnictví
        validate_ownership(course, user, "kurz")

        # Soft delete - nastavíme is_active na False
        course.soft_delete()
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_course error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_course_file(db: Session, course_id: int, file_id: int, user: dict) -> None:
    """Smaže soubor kurzu"""
    try:
        course_file: models.CourseFile | None = (
            db.execute(
                select(models.CourseFile).where(
                    models.CourseFile.file_id == file_id,
                    models.CourseFile.course_id == course_id,
                    models.CourseFile.is_active.is_(True),
                )
            )
            .scalars()
            .first()
        )

        if course_file is None:
            raise HTTPException(status_code=404, detail="Soubor nenalezen")
        
        # Validace vlastnictví
        validate_ownership(course_file, user, "soubor kurzu")

        if (
            course_file.course.status != Status.draft
            or course_file.course.is_active is False
        ):
            raise HTTPException(
                status_code=400, detail="Nelze mazat soubory z publikovaných kurzů"
            )

        # Smaž soubor z disku
        file_path = Path(course_file.file_path)
        if file_path.exists():
            file_path.unlink()

        # Smaž záznam z DB
        db.delete(course_file)
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_course_file error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_course_link(db: Session, course_id: int, link_id: int, user: dict) -> None:
    """Smaže odkaz kurzu"""
    try:
        course_link: models.CourseLink | None = (
            db.execute(
                select(models.CourseLink).where(
                    models.CourseLink.link_id == link_id,
                    models.CourseLink.course_id == course_id,
                    models.CourseLink.is_active.is_(True),
                )
            )
            .scalars()
            .first()
        )

        if course_link is None:
            raise HTTPException(status_code=404, detail="Odkaz nenalezen")
        
        # Validace vlastnictví
        validate_ownership(course_link, user, "odkaz kurzu")

        if (
            course_link.course.status != Status.draft
            or course_link.course.is_active is False
        ):
            raise HTTPException(
                status_code=400, detail="Nelze mazat odkazy z publikovaných kurzů"
            )

        # Smaž záznam z DB
        db.delete(course_link)
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_course_link error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
