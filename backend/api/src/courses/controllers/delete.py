"""
Controllery pro mazání zdrojů kurzu.
"""

import logging

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import Status, UserRole
from api.authorization import validate_owner_or_superadmin
from api.storage import seaweedfs

logger = logging.getLogger(__name__)

# Stavy, ve kterých může lektor (vlastník) kurz smazat
_LECTOR_DELETABLE_STATUSES = {
    Status.draft,
    Status.generated,
    Status.edited,
    Status.in_review,
}


def _lector_can_delete(course: models.Course) -> bool:
    """Vrátí True, pokud stav kurzu dovoluje smazání lektorem."""
    if course.status in _LECTOR_DELETABLE_STATUSES:
        return True
    # Schválený kurz lze smazat, pokud ještě není publikovaný
    if course.status == Status.approved and not course.is_published:
        return True
    return False


def delete_course(db: Session, course_id: int, user: models.User) -> None:
    """
    Smaže kurz dle stavu a role:
    - draft: hard delete — vlastník nebo superadmin (odstraní soubory ze SeaweedFS)
    - draft/generated/edited/in_review nebo approved+nepublikovaný: soft delete — vlastník nebo superadmin
    - published nebo archived: soft delete — pouze superadmin
    """
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    is_superadmin = user.role == UserRole.superadmin

    if not is_superadmin:
        # Lektor smí smazat jen kurzy ve vybraných stavech
        if not _lector_can_delete(course):
            raise HTTPException(
                status_code=403,
                detail="Nemáte oprávnění smazat kurz v tomto stavu",
            )
        # Only owner can delete (superadmin bypassed above, guarantor cannot delete others' courses)
        validate_owner_or_superadmin(course, user, "kurz")

    if course.status == Status.draft:
        # Hard delete — odstraň soubory ze SeaweedFS a pak z DB
        for f in course.files:
            try:
                seaweedfs.delete_file(f.file_path)
            except Exception as e:
                logger.warning("delete_course: chyba při mazání souboru %s: %s", f.file_path, e)

        # Explicitní cascade: smaž závislé záznamy před smazáním kurzu
        db.execute(delete(models.CourseFile).where(models.CourseFile.course_id == course_id))
        db.execute(delete(models.CourseLink).where(models.CourseLink.course_id == course_id))
        db.delete(course)
    else:
        course.soft_delete()

    db.commit()


def delete_course_file(db: Session, course_id: int, file_id: int, user: models.User) -> None:
    """Smaže soubor kurzu (pouze v draft stavu)"""
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

    validate_owner_or_superadmin(course_file, user, "soubor kurzu")

    if course_file.course.status != Status.draft or not course_file.course.is_active:
        raise HTTPException(
            status_code=400, detail="Nelze mazat soubory z publikovaných kurzů"
        )

    seaweedfs.delete_file(course_file.file_path)
    db.delete(course_file)
    db.commit()


def delete_course_link(db: Session, course_id: int, link_id: int, user: models.User) -> None:
    """Smaže odkaz kurzu (pouze v draft stavu)"""
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

    validate_owner_or_superadmin(course_link, user, "odkaz kurzu")

    if course_link.course.status != Status.draft or not course_link.course.is_active:
        raise HTTPException(
            status_code=400, detail="Nelze mazat odkazy z publikovaných kurzů"
        )

    db.delete(course_link)
    db.commit()
