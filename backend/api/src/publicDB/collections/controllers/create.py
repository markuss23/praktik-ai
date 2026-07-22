"""
Controllery pro vytváření sbírek veřejných materiálů.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.enums import PubResourceStatus
from api.src.common.utils import get_or_404
from api.authorization import validate_owner_or_superadmin
from api.src.publicDB.collections.schemas import (
    PubCollectionCreate,
    PubCollectionCreated,
    PubCollectionDetail,
)


def create_collection(
    db: Session,
    data: PubCollectionCreate,
    user: models.User,
) -> PubCollectionCreated:
    """Vytvoří novou sbírku veřejných materiálů pro přihlášeného uživatele."""

    duplicate = db.execute(
        select(models.PubCollection).where(
            models.PubCollection.user_id == user.user_id,
            models.PubCollection.title == data.title,
            models.PubCollection.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if duplicate is not None:
        raise HTTPException(
            status_code=409, detail="Sbírka s tímto názvem již existuje."
        )

    collection = models.PubCollection(**data.model_dump(), user_id=user.user_id)
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return PubCollectionCreated.model_validate(collection)


def add_resource_to_collection(
    db: Session,
    collection_id: int,
    resource_id: int,
    user: models.User,
) -> PubCollectionDetail:
    """
    Přidá veřejný materiál do sbírky. Materiál musí existovat a nesmí být ve sbírce, musí být schválen a veřejný.
    """
    collection = get_or_404(
        db, models.PubCollection, collection_id, detail="Sbírka nenalezena"
    )

    validate_owner_or_superadmin(collection, user, "sbírka")

    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    is_approved = resource.status == PubResourceStatus.approved
    is_owner = resource.author_id == user.user_id

    if not is_approved:
        raise HTTPException(
            status_code=400,
            detail="Do sbírky lze přidat pouze schválené materiály.",
        )

    if not resource.is_public and not is_owner:
        raise HTTPException(
            status_code=400,
            detail="Privátní materiál lze přidat pouze vlastníkem materiálu.",
        )

    # Zkontroluje, zda materiál již není ve sbírce
    existing = db.execute(
        select(models.PubCollectionResource).where(
            models.PubCollectionResource.collection_id == collection_id,
            models.PubCollectionResource.resource_id == resource_id,
            models.PubCollectionResource.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(status_code=409, detail="Materiál je již ve sbírce.")

    item = models.PubCollectionResource(
        collection_id=collection_id,
        resource_id=resource_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return PubCollectionDetail.model_validate(collection)
