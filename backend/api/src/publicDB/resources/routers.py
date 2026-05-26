from typing import Literal

from fastapi import APIRouter, UploadFile, File

from api.dependencies import CurrentUser, require_role

from api.src.common.annotations import (
    RESOURCE_DIFFICULTY_LEVEL_ID_ANNOTATION,
    RESOURCE_EDU_LEVEL_ID_ANNOTATION,
    RESOURCE_STATUS_ANNOTATION,
    RESOURCE_SUBJECT_ID_ANNOTATION,
    RESOURCE_TARGET_ID_ANNOTATION,
    INCLUDE_INACTIVE_ANNOTATION,
    IS_PUBLISHED_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)

from api.src.publicDB.resources.schemas import (
    PubResourceCreate,
    PubResourceCreated,
    PubResourceFile,
    PubResource,
    PubResourceUpdate,
)
from api.src.publicDB.resources.controllers import (
    create_resource,
    upload_resource_file,
    get_resource,
    get_resources,
    delete_resource,
    delete_resource_file,
    update_resource,
    update_resource_status,
    update_resource_public_state,
)

from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/resources", tags=["Resources"])
public_router = APIRouter(prefix="/resources", tags=["Resources"])

# ----------- Resource endpoints -----------


@public_router.get("", operation_id="list_resources")
async def list_resources(
    db: SessionSqlSessionDependency,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
    is_published: IS_PUBLISHED_ANNOTATION = False,
    education_level: RESOURCE_EDU_LEVEL_ID_ANNOTATION = None,
    difficulty_level: RESOURCE_DIFFICULTY_LEVEL_ID_ANNOTATION = None,
    resource_target_id: RESOURCE_TARGET_ID_ANNOTATION = None,
    resource_subject_id: RESOURCE_SUBJECT_ID_ANNOTATION = None,
    status: RESOURCE_STATUS_ANNOTATION = None,
) -> list[PubResource]:
    return get_resources(
        db,
        include_inactive=include_inactive,
        text_search=text_search,
        is_public=is_published,
        education_level=education_level,
        difficulty_level=difficulty_level,
        resource_target_id=resource_target_id,
        resource_subject_id=resource_subject_id,
        status=status,
    )


@router.get(
    "/{resource_id}", operation_id="get_resource", dependencies=[require_role("user")]
)
async def endp_get_resource(
    resource_id: int, db: SessionSqlSessionDependency
) -> PubResource:
    return get_resource(db, resource_id)


@router.post("", operation_id="create_resource", dependencies=[require_role("user")])
async def endp_create_resource(
    resource: PubResourceCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PubResourceCreated:
    return create_resource(db, resource, user)


@router.delete(
    "/{resource_id}",
    operation_id="delete_resource",
    dependencies=[require_role("user")],
)
async def endp_delete_resource(
    resource_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_resource(db, resource_id, user)


@router.put(
    "/{resource_id}",
    operation_id="update_resource",
    dependencies=[require_role("user")],
)
async def endp_update_resource(
    resource_id: int,
    resource_data: PubResourceUpdate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return update_resource(db, resource_id, resource_data, user)


@router.put(
    "/{resource_id}/status",
    operation_id="update_resource_status",
    dependencies=[require_role("user")],
)
async def endp_update_resource_status(
    resource_id: int,
    new_status: Literal[
        "draft",
        "pending_review",
    ],
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return update_resource_status(db, resource_id, new_status, user)


@router.put(
    "/{resource_id}/public",
    operation_id="update_resource_public_state",
    dependencies=[require_role("user")],
)
async def endp_update_resource_public_state(
    resource_id: int,
    is_published: bool,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return update_resource_public_state(db, resource_id, is_published, user)


# ----------- File endpoints -----------


@router.post(
    "/{resource_id}/files",
    operation_id="upload_resource_file",
    dependencies=[require_role("user")],
)
async def endp_upload_resource_file(
    resource_id: int,
    user: CurrentUser,
    db: SessionSqlSessionDependency,
    file: UploadFile = File(...),
) -> PubResourceFile:
    return await upload_resource_file(db, resource_id, file, user)


@router.delete(
    "/{resource_id}/files/{file_id}",
    operation_id="delete_resource_file",
    dependencies=[require_role("user")],
)
async def endp_delete_resource_file(
    resource_id: int, file_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_resource_file(db, resource_id, file_id, user)
