"""
Controllery pro vytváření zdrojů kurzu.
"""

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.courses.schemas import CourseCreate, CourseCreated, CourseFile, CourseLink
from api import enums
from api.authorization import validate_ownership
from api.storage import seaweedfs


def create_course(
    db: Session, course_data: CourseCreate, user: models.User
) -> CourseCreated:
    """Vytvoří nový kurz ve stavu draft"""
    try:
        if (
            db.execute(
                select(models.CourseBlock).where(
                    models.CourseBlock.block_id == course_data.course_block_id,
                    models.CourseBlock.is_active.is_(True),
                )
            ).first()
            is None
        ):
            raise HTTPException(
                status_code=400, detail="Tematický blok s tímto ID neexistuje"
            )

        if (
            db.execute(
                select(models.CourseTarget).where(
                    models.CourseTarget.target_id == course_data.course_target_id,
                    models.CourseTarget.is_active.is_(True),
                )
            ).first()
            is None
        ):
            raise HTTPException(
                status_code=400, detail="Cílová skupina s tímto ID neexistuje"
            )

        if (
            course_data.course_subject_id is not None
            and db.execute(
                select(models.CourseSubject).where(
                    models.CourseSubject.subject_id == course_data.course_subject_id,
                    models.CourseSubject.is_active.is_(True),
                )
            ).first()
            is None
        ):
            raise HTTPException(status_code=400, detail="Obor s tímto ID neexistuje")

        if db.execute(
            select(models.Course).where(
                models.Course.title == course_data.title,
                models.Course.is_active.is_(True),
            )
        ).first():
            raise HTTPException(
                status_code=400, detail="Kurz s tímto názvem již existuje"
            )

        course = models.Course(**course_data.model_dump(), owner_id=user.user_id)
        db.add(course)
        db.commit()
        db.refresh(course)

        return CourseCreated.model_validate(course)
    except HTTPException:
        raise
    except Exception as e:
        print(f"create_course error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


async def upload_course_file(
    db: Session, course_id: int, file: UploadFile, user: models.User
) -> CourseFile:
    """Nahraje soubor ke kurzu (pouze v draft stavu)"""
    try:
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

        validate_ownership(course, user, "kurz")

        if course.status != enums.Status.draft:
            raise HTTPException(
                status_code=400, detail="Nelze přidávat soubory do publikovaných kurzů"
            )

        remote_path = f"courses/{course_id}/{file.filename}"

        content = await file.read()
        seaweedfs.upload_file(
            remote_path,
            content,
            file.filename,
            file.content_type or "application/octet-stream",
        )

        course_file = models.CourseFile(
            course_id=course_id,
            filename=file.filename or "unknown",
            file_path=remote_path,
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


def create_course_link(
    db: Session, course_id: int, url: str, user: models.User
) -> CourseLink:
    """Vytvoří odkaz kurzu (pouze v draft stavu)"""
    try:
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

        validate_ownership(course, user, "kurz")

        if course.status != enums.Status.draft:
            raise HTTPException(
                status_code=400, detail="Nelze přidávat odkazy do publikovaných kurzů"
            )

        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Neplatná URL adresa")

        if (
            db.execute(
                select(models.CourseLink).where(
                    models.CourseLink.course_id == course_id,
                    models.CourseLink.url == url,
                    models.CourseLink.is_active.is_(True),
                )
            ).first()
            is not None
        ):
            raise HTTPException(
                status_code=400, detail="Odkaz s touto URL již pro tento kurz existuje"
            )

        course_link = models.CourseLink(course_id=course_id, url=url)
        db.add(course_link)
        db.commit()
        db.refresh(course_link)

        return CourseLink.model_validate(course_link)

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_course_link error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
