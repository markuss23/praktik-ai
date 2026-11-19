"""
Controllery pro mazání veřejných materiálů.
"""

import logging

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import PubResourceStatus, UserRole
from api.authorization import validate_owner_or_superadmin
from api.storage import seaweedfs

logger = logging.getLogger(__name__)


def delete_resource(db: Session, resource_id: int, user: models.User) -> None:
    """
    Smaže veřejný materiál.
    """

    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    if resource.allow_forks and resource.status == PubResourceStatus.approved:
        raise HTTPException(
            status_code=400,
            detail="Nelze smazat materiál, který umožňuje forkování.",
        )

    if resource.is_public:
        raise HTTPException(
            status_code=400,
            detail="Nelze smazat materiál ve který je publikován.",
        )

    is_superadmin = user.role == UserRole.superadmin

    if not is_superadmin:
        validate_owner_or_superadmin(resource, user, "materiál")

    # Pokud se nachazi ve stavu draft, provedeme hard delete, jinak soft delete
    if resource.status == PubResourceStatus.draft:
        _hard_delete_draft(db, resource_id)
    else:
        resource.soft_delete()
        db.commit()


# Vazby, které draft má vždy (KRAUU, Bloom) nebo může mít (soubory, záznam forku).
# Mažou se spolu s materiálem.
_DRAFT_OWNED_ROWS = (
    (models.PubResourceKrauuCompetence, models.PubResourceKrauuCompetence.resource_id),
    (models.PubResourceBloomLevel, models.PubResourceBloomLevel.resource_id),
    (models.PubResourceFile, models.PubResourceFile.resource_id),
    (models.PubResourceFork, models.PubResourceFork.forked_id),
)

# Vazby, které draft mít nemá (hodnotit, recenzovat, komentovat, přidat do sbírky
# a forkovat jde jen materiál v jiném stavu). Pokud existují, mazání se odmítne.
_DRAFT_FORBIDDEN_ROWS = (
    (models.PubResourceRating, models.PubResourceRating.resource_id),
    (models.PubResourceReview, models.PubResourceReview.resource_id),
    (models.PubResourceComment, models.PubResourceComment.resource_id),
    (models.PubCollectionResource, models.PubCollectionResource.resource_id),
    (models.PubResourceFork, models.PubResourceFork.original_id),
)


def _hard_delete_draft(db: Session, resource_id: int) -> None:
    """
    Natvrdo smaže materiál ve stavu draft i s jeho vazbami a soubory v úložišti.

    """
    for model, column in _DRAFT_FORBIDDEN_ROWS:
        if db.execute(select(column).where(column == resource_id).limit(1)).first():
            raise HTTPException(
                status_code=400,
                detail=f"Materiál nelze smazat, existují k němu záznamy v {model.__tablename__}.",
            )

    # Cesty všech souborů (i neaktivních) je potřeba načíst před smazáním řádků.
    file_paths = (
        db.execute(
            select(models.PubResourceFile.file_path).where(
                models.PubResourceFile.resource_id == resource_id
            )
        )
        .scalars()
        .all()
    )

    for model, column in _DRAFT_OWNED_ROWS:
        db.execute(delete(model).where(column == resource_id))
    db.execute(
        delete(models.PubResource).where(models.PubResource.resource_id == resource_id)
    )
    db.commit()

    for file_path in file_paths:
        try:
            seaweedfs.delete_file(file_path)
        except Exception as e:
            logger.error(
                "delete_resource: Chyba při mazání souboru %s: %s", file_path, e
            )


def delete_resource_file(
    db: Session, resource_id: int, file_id: int, user: models.User
) -> None:
    """Smaže soubor materiálu (pouze ve stavech `draft` nebo `rejected`).

    Povolené stavy pro smazání souboru jsou `PubResourceStatus.draft` a
    `PubResourceStatus.rejected`. Pokud je materiál v jiném stavu nebo není
    aktivní, operace je zakázána.
    """
    resource_file: models.PubResourceFile | None = (
        db.execute(
            select(models.PubResourceFile).where(
                models.PubResourceFile.file_id == file_id,
                models.PubResourceFile.resource_id == resource_id,
                models.PubResourceFile.is_active.is_(True),
            )
        )
        .scalars()
        .first()
    )

    if resource_file is None:
        raise HTTPException(status_code=404, detail="Soubor nenalezen")

    validate_owner_or_superadmin(resource_file, user, "soubor materiálu")

    allowed_statuses = {PubResourceStatus.draft, PubResourceStatus.rejected}

    if (
        resource_file.resource.status not in allowed_statuses
        or not resource_file.resource.is_active
    ):
        raise HTTPException(
            status_code=400,
            detail="Nelze mazat soubory materiálu mimo stavy draft nebo rejected",
        )

    seaweedfs.delete_file(resource_file.file_path)
    db.delete(resource_file)
    db.commit()
