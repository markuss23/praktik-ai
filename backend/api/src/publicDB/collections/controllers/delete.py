"""
Controllery pro mazání sbírek a jejich položek.
"""

from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.authorization import validate_owner_or_superadmin


def delete_collection(
    db: Session,
    collection_id: int,
    user: models.User,
) -> None:
    """
    Smaže sbírku včetně všech jejích položek (cascade soft delete).

    """
    collection = get_or_404(
        db, models.PubCollection, collection_id, detail="Sbírka nenalezena"
    )

    validate_owner_or_superadmin(collection, user, "sbírka")

    collection.soft_delete()
    db.commit()


def remove_resource_from_collection(
    db: Session,
    collection_id: int,
    resource_id: int,
    user: models.User,
) -> None:
    """
    Odebere materiál ze sbírky.
    """
    collection = get_or_404(
        db, models.PubCollection, collection_id, detail="Sbírka nenalezena"
    )

    validate_owner_or_superadmin(collection, user, "sbírka")

    item = db.execute(
        select(models.PubCollectionResource).where(
            models.PubCollectionResource.collection_id == collection_id,
            models.PubCollectionResource.resource_id == resource_id,
            models.PubCollectionResource.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if item is None:
        raise HTTPException(status_code=404, detail="Materiál ve sbírce nenalezen.")

    db.execute(
        delete(models.PubCollectionResource).where(
            models.PubCollectionResource.collection_id == collection_id,
            models.PubCollectionResource.resource_id == resource_id,
        )
    )
    db.commit()
