"""
Controllery pro čtení sbírek veřejných materiálů.
"""

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.enums import PubResourceStatus, UserRole
from api.src.publicDB.collections.schemas import (
    PubCollectionDetail,
    PubCollectionResourceItem,
)

_ITEMS_LOAD = joinedload(models.PubCollection.items).joinedload(
    models.PubCollectionResource.resource
)


def get_public_collections(
    db: Session,
    user: models.User,
    text_search: str | None = None,
) -> list[PubCollectionDetail]:
    """Vrátí seznam veřejných sbírek – včetně vlastních zveřejněných sbírek uživatele."""

    stm = (
        select(models.PubCollection)
        .options(_ITEMS_LOAD)
        .where(
            models.PubCollection.is_public.is_(True),
            models.PubCollection.is_active.is_(True),
        )
        .order_by(models.PubCollection.collection_id.desc())
    )

    if text_search is not None:
        stm = stm.where(
            or_(
                models.PubCollection.title.ilike(f"%{text_search}%"),
                models.PubCollection.description.ilike(f"%{text_search}%"),
            )
        )

    results = db.execute(stm).unique().scalars().all()
    return [_build_collection_detail(c, user.user_id) for c in results]


def get_my_collections(
    db: Session,
    user: models.User,
    include_inactive: bool = False,
    text_search: str | None = None,
) -> list[PubCollectionDetail]:
    """Vrátí seznam sbírek přihlášeného uživatele s jejich materiály."""

    stm = (
        select(models.PubCollection)
        .options(_ITEMS_LOAD)
        .where(models.PubCollection.user_id == user.user_id)
        .order_by(models.PubCollection.collection_id.desc())
    )

    if not include_inactive:
        stm = stm.where(models.PubCollection.is_active.is_(True))

    if text_search is not None:
        stm = stm.where(
            or_(
                models.PubCollection.title.ilike(f"%{text_search}%"),
                models.PubCollection.description.ilike(f"%{text_search}%"),
            )
        )

    results = db.execute(stm).unique().scalars().all()
    return [_build_collection_detail(c, user.user_id) for c in results]


def get_collection(
    db: Session,
    collection_id: int,
    user: models.User,
    text_search: str | None = None,
) -> PubCollectionDetail:
    """Vrátí detail sbírky se zafiltrovanými položkami podle pravidel viditelnosti a volitelného filtru."""

    collection = (
        db.execute(
            select(models.PubCollection)
            .options(_ITEMS_LOAD)
            .where(
                models.PubCollection.collection_id == collection_id,
                models.PubCollection.is_active.is_(True),
            )
        )
        .unique()
        .scalar_one_or_none()
    )

    if collection is None:
        raise HTTPException(status_code=404, detail="Sbírka nenalezena")

    is_superadmin = user.role == UserRole.superadmin
    if (
        not collection.is_public
        and collection.user_id != user.user_id
        and not is_superadmin
    ):
        raise HTTPException(status_code=403, detail="Nemáte přístup k této sbírce.")

    return _build_collection_detail(collection, user.user_id, text_search)


def _is_item_visible(
    resource: models.PubResource,
    collection_owner_id: int,
    viewer_id: int,
) -> bool:
    """Vrátí True pokud je položka sbírky viditelná pro daného uživatele.

    Vlastník sbírky vidí i své privátní materiály, ostatní jen schválené a veřejné.
    """
    if not resource.is_active:
        return False
    if resource.author_id == collection_owner_id and viewer_id == collection_owner_id:
        return True
    return resource.is_public and resource.status == PubResourceStatus.approved


def _build_collection_detail(
    collection: models.PubCollection,
    viewer_id: int,
    text_search: str | None = None,
) -> PubCollectionDetail:
    """Sestaví PubCollectionDetail s aplikovanými pravidly viditelnosti a volitelným filtrem položek."""
    search = text_search.lower() if text_search else None

    filtered_items = [
        PubCollectionResourceItem.model_validate(item)
        for item in collection.items
        if _is_item_visible(item.resource, collection.user_id, viewer_id)
        and (
            search is None
            or search in (item.resource.title or "").lower()
            or search in (item.resource.description or "").lower()
        )
    ]

    return PubCollectionDetail(
        collection_id=collection.collection_id,
        user_id=collection.user_id,
        title=collection.title,
        description=collection.description,
        is_public=collection.is_public,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        is_active=collection.is_active,
        items=filtered_items,
    )
