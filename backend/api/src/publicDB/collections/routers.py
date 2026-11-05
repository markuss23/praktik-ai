from fastapi import APIRouter

from api.dependencies import CurrentUser, require_role
from api.database import SessionSqlSessionDependency
from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)
from api.src.publicDB.collections.schemas import (
    PubCollectionCreate,
    PubCollectionUpdate,
    PubCollectionCreated,
    PubCollectionDetail,
)
from api.src.publicDB.collections.controllers import (
    create_collection,
    add_resource_to_collection,
    get_my_collections,
    get_public_collections,
    get_collection,
    update_collection,
    update_collection_public_state,
    delete_collection,
    remove_resource_from_collection,
)

router = APIRouter(prefix="/collections", tags=["Collections"])
public_router = APIRouter(prefix="/collections", tags=["Collections"])


@public_router.get("/public", operation_id="get_public_collections")
async def list_public_collections(
    db: SessionSqlSessionDependency,
    text_search: TEXT_SEARCH_ANNOTATION = None,
) -> list[PubCollectionDetail]:
    return get_public_collections(db, text_search)


@router.get("", operation_id="get_my_collections", dependencies=[require_role("user")])
async def endp_get_my_collections(
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
) -> list[PubCollectionDetail]:
    return get_my_collections(db, user, include_inactive, text_search)


@router.get(
    "/{collection_id}",
    operation_id="get_collection",
    dependencies=[require_role("user")],
)
async def endp_get_collection(
    collection_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    text_search: TEXT_SEARCH_ANNOTATION = None,
) -> PubCollectionDetail:
    return get_collection(db, collection_id, user, text_search)


@router.post("", operation_id="create_collection", dependencies=[require_role("user")])
async def endp_create_collection(
    data: PubCollectionCreate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubCollectionCreated:
    return create_collection(db, data, user)


@router.put(
    "/{collection_id}",
    operation_id="update_collection",
    dependencies=[require_role("user")],
)
async def endp_update_collection(
    collection_id: int,
    data: PubCollectionUpdate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubCollectionCreated:
    return update_collection(db, collection_id, data, user)


@router.put(
    "/{collection_id}/public",
    operation_id="update_collection_public_state",
    dependencies=[require_role("user")],
)
async def endp_update_collection_public_state(
    collection_id: int,
    is_public: bool,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubCollectionCreated:
    return update_collection_public_state(db, collection_id, is_public, user)


@router.delete(
    "/{collection_id}",
    operation_id="delete_collection",
    dependencies=[require_role("user")],
    status_code=204,
)
async def endp_delete_collection(
    collection_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> None:
    delete_collection(db, collection_id, user)


@router.post(
    "/{collection_id}/resources/{resource_id}",
    operation_id="add_resource_to_collection",
    dependencies=[require_role("user")],
)
async def endp_add_resource_to_collection(
    collection_id: int,
    resource_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubCollectionDetail:
    return add_resource_to_collection(db, collection_id, resource_id, user)


@router.delete(
    "/{collection_id}/resources/{resource_id}",
    operation_id="remove_resource_from_collection",
    dependencies=[require_role("user")],
    status_code=204,
)
async def endp_remove_resource_from_collection(
    collection_id: int,
    resource_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> None:
    remove_resource_from_collection(db, collection_id, resource_id, user)
