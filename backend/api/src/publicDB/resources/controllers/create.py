"""
Controllery pro vytváření veřejných materiálů.
"""

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.src.common.utils import get_or_404
from api.src.publicDB.resources.schemas import (
    PubResourceCreate,
    PubResourceCreated,
    PubResourceFile,
)
from api.storage import seaweedfs


def create_resource(
    db: Session,
    data: PubResourceCreate,
    user: models.User,
) -> PubResourceCreated:
    """Vytvoří nový veřejný materiál ve stavu draft."""

    if data.subject_id is not None:
        if (
            db.execute(
                select(models.CourseSubject).where(
                    models.CourseSubject.subject_id == data.subject_id,
                    models.CourseSubject.is_active.is_(True),
                )
            ).first()
            is None
        ):
            raise HTTPException(status_code=400, detail="Obor s tímto ID neexistuje")

    if data.target_id is not None:
        if (
            db.execute(
                select(models.CourseTarget).where(
                    models.CourseTarget.target_id == data.target_id,
                    models.CourseTarget.is_active.is_(True),
                )
            ).first()
            is None
        ):
            raise HTTPException(
                status_code=400, detail="Cílová skupina s tímto ID neexistuje"
            )
    # Kontrola unikátnosti názvu materiálu pro stejného autora
    if (
        db.execute(
            select(models.PubResource).where(
                models.PubResource.author_id == user.user_id,
                models.PubResource.title == data.title,
                models.PubResource.is_active.is_(True),
            )
        ).first()
        is not None
    ):
        raise HTTPException(
            status_code=409, detail="Materiál s tímto názvem již existuje"
        )

    resource_data = data.model_dump()
    resource = models.PubResource(**resource_data, author_id=user.user_id)
    db.add(resource)
    db.flush()

    db.commit()
    db.refresh(resource)

    return PubResourceCreated.model_validate(resource)


async def upload_resource_file(
    db: Session,
    resource_id: int,
    file: UploadFile,
    user: models.User,
) -> PubResourceFile:
    """Nahraje soubor k existujícímu materiálu."""
    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )
    validate_owner_or_superadmin(resource, user, "materiál")

    # Omezit velikost souboru na 30 MB
    max_file_size = 30 * 1024 * 1024
    content = await file.read()
    if len(content) > max_file_size:
        raise HTTPException(status_code=413, detail="Soubor nesmí být větší než 30 MB")

    remote_path = f"resources/{resource_id}/{file.filename}"
    seaweedfs.upload_file(
        remote_path,
        content,
        file.filename,
        file.content_type or "application/octet-stream",
    )

    resource_file = models.PubResourceFile(
        resource_id=resource_id,
        filename=file.filename or "unknown",
        file_path=remote_path,
        file_type=_detect_file_type(file.filename or ""),
    )
    db.add(resource_file)
    db.commit()
    db.refresh(resource_file)

    return PubResourceFile.model_validate(resource_file)


def _detect_file_type(filename: str) -> models.AttachType:
    """Detekuje typ souboru z přípony."""
    from api.enums import AttachType

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "pdf": AttachType.pdf,
        "docx": AttachType.docx,
        "pptx": AttachType.pptx,
        "jpg": AttachType.image,
        "jpeg": AttachType.image,
        "png": AttachType.image,
        "gif": AttachType.image,
        "webp": AttachType.image,
        "svg": AttachType.image,
        "mp4": AttachType.video,
        "mov": AttachType.video,
        "avi": AttachType.video,
        "mkv": AttachType.video,
        "webm": AttachType.video,
    }
    return mapping.get(ext, AttachType.other)
