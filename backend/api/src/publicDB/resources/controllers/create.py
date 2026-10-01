"""
Controllery pro vytváření veřejných materiálů.
"""

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.src.catalogs.controllers import (
    sync_bloom_levels,
    sync_krauu_competences,
    validate_bloom_level_ids,
    validate_krauu_competence_ids,
)
from api.src.common.utils import get_or_404
from api.src.publicDB.resources.schemas import (
    PubResourceCreate,
    PubResourceCreated,
    PubResourceFile,
    PubResourceCreateFork,
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

    if (
        db.execute(
            select(models.CourseEqfLevel).where(
                models.CourseEqfLevel.eqf_level_id == data.eqf_level_id,
                models.CourseEqfLevel.is_active.is_(True),
            )
        ).first()
        is None
    ):
        raise HTTPException(status_code=400, detail="EQF úroveň s tímto ID neexistuje")

    if (
        db.execute(
            select(models.CourseType).where(
                models.CourseType.type_id == data.course_type_id,
                models.CourseType.is_active.is_(True),
            )
        ).first()
        is None
    ):
        raise HTTPException(status_code=400, detail="Typ kurzu s tímto ID neexistuje")

    validate_krauu_competence_ids(db, data.krauu_competence_ids)
    validate_bloom_level_ids(db, data.bloom_level_ids)

    resource_data = data.model_dump(exclude={"krauu_competence_ids", "bloom_level_ids"})
    resource = models.PubResource(**resource_data, author_id=user.user_id)
    db.add(resource)
    db.flush()

    sync_krauu_competences(
        db,
        models.PubResourceKrauuCompetence,
        "resource_id",
        resource.resource_id,
        data.krauu_competence_ids,
    )
    sync_bloom_levels(
        db,
        models.PubResourceBloomLevel,
        "resource_id",
        resource.resource_id,
        data.bloom_level_ids,
    )
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
        file_type=_detect_file_type(content),
    )
    db.add(resource_file)
    db.commit()
    db.refresh(resource_file)

    return PubResourceFile.model_validate(resource_file)


def _detect_file_type(content: bytes) -> models.AttachType:
    """Detekuje typ souboru z obsahu (magic bytes)."""
    import filetype
    from api.enums import AttachType

    kind = filetype.guess(content)
    if kind is None:
        return AttachType.other

    mime = kind.mime
    if mime == "application/pdf":
        return AttachType.pdf
    if (
        mime
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        return AttachType.docx
    if (
        mime
        == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ):
        return AttachType.pptx
    if mime.startswith("image/"):
        return AttachType.image
    if mime.startswith("video/"):
        return AttachType.video
    return AttachType.other


def create_resource_fork(
    db: Session,
    resource_id: int,
    data: PubResourceCreateFork,
    user: models.User,
) -> PubResourceCreated:
    """Vytvoří fork (upravenou kopii) existujícího veřejného materiálu."""
    original = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    # overeni pokud je material fork
    if original.is_fork:
        raise HTTPException(status_code=400, detail="Nelze vytvořit kopii z kopie")

    # overeni pokud je material public a zda povoluje forkovani
    if not original.is_public:
        raise HTTPException(
            status_code=403, detail="Forky lze vytvářet pouze z veřejných materiálů"
        )

    if not original.allow_forks:
        raise HTTPException(
            status_code=403, detail="Autor tohoto materiálu neumožňuje vytváření forků"
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
    resource_data["subject_id"] = original.subject_id
    resource_data["target_id"] = original.target_id
    resource_data["education_level"] = original.education_level
    resource_data["difficulty_level"] = original.difficulty_level
    resource_data["eqf_level_id"] = original.eqf_level_id
    resource_data["course_type_id"] = original.course_type_id

    forked = models.PubResource(
        **resource_data,
        author_id=user.user_id,
        is_fork=True,
        allow_forks=False,
    )
    db.add(forked)
    db.flush()

    sync_krauu_competences(
        db,
        models.PubResourceKrauuCompetence,
        "resource_id",
        forked.resource_id,
        [link.krauu_id for link in original.krauu_competences],
    )
    sync_bloom_levels(
        db,
        models.PubResourceBloomLevel,
        "resource_id",
        forked.resource_id,
        [link.bloom_id for link in original.bloom_levels],
    )

    fork_record = models.PubResourceFork(
        original_id=resource_id,
        forked_id=forked.resource_id,
        author_id=user.user_id,
    )
    db.add(fork_record)

    db.commit()
    db.refresh(forked)

    return PubResourceCreated.model_validate(forked)
