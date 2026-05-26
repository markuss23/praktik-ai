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

    is_superadmin = user.role == UserRole.superadmin

    if not is_superadmin:
        validate_owner_or_superadmin(resource, user, "materiál")

    # Pokud se nachazi ve stavu draft, provedeme hard delete, jinak soft delete
    if resource.status == PubResourceStatus.draft:
        for files in resource.files:
            try:
                if files.is_active:
                    seaweedfs.delete_file(files.file_path)
            except Exception as e:
                logger.error(
                    "delete_resource: Chyba při mazání souboru %s: %s",
                    files.file_path,
                    e,
                )

        # Smazání záznamu materiálu a jeho souborů
        db.execute(
            delete(models.PubResourceFile).where(
                models.PubResourceFile.resource_id == resource_id
            )
        )
        db.delete(resource)
    else:
        resource.soft_delete()

    db.commit()


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
