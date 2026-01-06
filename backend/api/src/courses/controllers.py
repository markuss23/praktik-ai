import os
import uuid
from collections.abc import Sequence
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import Select, or_, select, update
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import CourseLink
from api.src.courses.schemas import CourseCreate, CourseFile
from api.src.courses.schemas import Course


# Složka pro ukládání souborů
UPLOAD_DIR = Path("/code/uploads/courses")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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


async def upload_course_file(
    db: Session, course_id: int, file: UploadFile
) -> CourseFile:
    """Nahraje soubor ke kurzu"""
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


def delete_course_file(db: Session, course_id: int, file_id: int) -> None:
    """Smaže soubor kurzu"""
    try:
        course_file = (
            db.execute(
                select(models.CourseFile).where(
                    models.CourseFile.file_id == file_id,
                    models.CourseFile.course_id == course_id,
                )
            )
            .scalars()
            .first()
        )

        if course_file is None:
            raise HTTPException(status_code=404, detail="File not found")

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


def create_course_link(
    db: Session, course_id: int, title: str, url: str
) -> CourseLink:
    """Vytvoří odkaz kurzu"""
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

        # Ověř že je odkaz validní
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid URL")

        # Vytvoř záznam odkazu
        course_link = models.CourseLink(
            course_id=course_id,
            title=title,
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


def delete_course_link(db: Session, course_id: int, link_id: int) -> None:
    """Smaže odkaz kurzu"""
    try:
        course_link = (
            db.execute(
                select(models.CourseLink).where(
                    models.CourseLink.link_id == link_id,
                    models.CourseLink.course_id == course_id,
                )
            )
            .scalars()
            .first()
        )

        if course_link is None:
            raise HTTPException(status_code=404, detail="Link not found")

        # Smaž záznam z DB
        db.delete(course_link)
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_course_link error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
