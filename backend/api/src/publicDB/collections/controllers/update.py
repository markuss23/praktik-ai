"""
Controllery pro upravování sbírek veřejných materiálů.
"""

from sqlalchemy import update
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.src.publicDB.collections.schemas import (
    PubCollectionUpdate,
    PubCollectionCreated,
)
from api.authorization import validate_owner_or_superadmin


def update_collection(
    db: Session,
    collection_id: int,
    data: PubCollectionUpdate,
    user: models.User,
) -> PubCollectionCreated:
    """
    Aktualizuje metadata sbírky (title, description).
    """
    collection = get_or_404(
        db, models.PubCollection, collection_id, detail="Sbírka nenalezena"
    )

    validate_owner_or_superadmin(collection, user, "sbírka")

    update_data = data.model_dump(exclude_unset=True, exclude_none=True)

    db.execute(
        update(models.PubCollection)
        .where(models.PubCollection.collection_id == collection_id)
        .values(**update_data)
    )
    db.commit()
    db.refresh(collection)
    return PubCollectionCreated.model_validate(collection)


def update_collection_public_state(
    db: Session,
    collection_id: int,
    is_public: bool,
    user: models.User,
) -> PubCollectionCreated:
    """
    Aktualizuje stav sbírky (veřejná/soukromá).
    """
    collection = get_or_404(
        db, models.PubCollection, collection_id, detail="Sbírka nenalezena"
    )

    validate_owner_or_superadmin(collection, user, "sbírka")

    db.execute(
        update(models.PubCollection)
        .where(models.PubCollection.collection_id == collection_id)
        .values(is_public=is_public)
    )
    db.commit()
    db.refresh(collection)
    return PubCollectionCreated.model_validate(collection)
