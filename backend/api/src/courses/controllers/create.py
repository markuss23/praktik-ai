"""
Controllery pro vytváření zdrojů kurzu.
"""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import Course, CourseCreate, CourseFile, CourseLink
from api import enums
from api.authorization import validate_ownership


# Složka pro ukládání souborů
UPLOAD_DIR = Path("/code/uploads/courses")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def create_course(db: Session, course_data: CourseCreate, user: dict) -> Course:
    """Vytvoří nový kurz"""
    try:
        if (
            db.execute(
                select(models.Category).where(
                    models.Category.category_id == course_data.category_id,
                    models.Category.is_active.is_(True),
                )
            ).first()
            is None
        ):
            raise HTTPException(
                status_code=400, detail="Kategorie s tímto ID neexistuje"
            )
        
        if db.execute(
            select(models.Course).where(
                models.Course.title == course_data.title,
                models.Course.is_active.is_(True),
            )
        ).first():
            raise HTTPException(
                status_code=400, detail="Kurz s tímto názvem již existuje"
            )

        # Přiřadí vlastníka kurzu
        course_dict = course_data.model_dump()
        course_dict['owner_id'] = user.get('sub')
        
        course = models.Course(**course_dict)

        db.add(course)
        db.commit()
        db.refresh(course)

        return course
    except HTTPException:
        raise
    except Exception as e:
        print(f"create_course error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


async def upload_course_file(
    db: Session, course_id: int, file: UploadFile, user: dict
) -> CourseFile:
    """Nahraje soubor ke kurzu"""
    try:
        # Ověř, že kurz existuje
        course: models.Course | None = (
            db.execute(
                select(models.Course).where(
                    models.Course.course_id == course_id,
                    models.Course.is_active.is_(True),
                )
            )
            .scalars()
            .first()
        )

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")
        
        # Validace vlastnictví
        validate_ownership(course, user, "kurz")

        if course.status != enums.Status.draft:
            raise HTTPException(
                status_code=400, detail="Nelze přidávat soubory do publikovaných kurzů"
            )

        # Vytvoř složku pro kurz
        course_dir = UPLOAD_DIR / str(course_id)
        course_dir.mkdir(parents=True, exist_ok=True)

        # Vygeneruj unikátní název souboru
        file_ext = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = course_dir / unique_filename

        # Ulož soubor
        content = await file.read()
        file_path.write_bytes(content)

        # Ulož záznam do DB
        course_file = models.CourseFile(
            course_id=course_id,
            filename=file.filename or "unknown",
            file_path=str(file_path),
        )

        db.add(course_file)
        db.commit()
        db.refresh(course_file)

        return CourseFile.model_validate(course_file)

    except HTTPException:
        raise
    except Exception as e:
        print(f"upload_course_file error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def create_course_link(db: Session, course_id: int, url: str, user: dict) -> CourseLink:
    """Vytvoří odkaz kurzu"""
    try:
        # Ověř, že kurz existuje
        course: models.Course | None = (
            db.execute(
                select(models.Course).where(
                    models.Course.course_id == course_id,
                    models.Course.is_active.is_(True),
                )
            )
            .scalars()
            .first()
        )

        if course is None:
            raise HTTPException(status_code=404, detail="Kurz nenalezen")
        
        # Validace vlastnictví
        validate_ownership(course, user, "kurz")

        if course.status != enums.Status.draft:
            raise HTTPException(
                status_code=400, detail="Nelze přidávat odkazy do publikovaných kurzů"
            )

        # Ověř že je odkaz validní
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid URL")

        # Kontrola duplicitní URL
        existing_link: models.CourseLink | None = (
            db.execute(
                select(models.CourseLink).where(
                    models.CourseLink.course_id == course_id,
                    models.CourseLink.url == url,
                )
            )
            .scalars()
            .first()
        )

        if existing_link is not None:
            raise HTTPException(
                status_code=400, detail="Odkaz s touto URL již pro tento kurz existuje"
            )

        # Vytvoř záznam odkazu
        course_link = models.CourseLink(
            course_id=course_id,
            url=url,
        )

        db.add(course_link)
        db.commit()
        db.refresh(course_link)

        return CourseLink.model_validate(course_link)

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_course_link error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
