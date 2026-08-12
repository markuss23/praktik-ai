from typing import Literal

import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException

from fastapi.responses import Response
from api.src.common.utils import attachment_response, get_or_404
from api.storage import seaweedfs

from api import models

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
    RESOURCE_IS_FORK_ANNOTATION,
    RESROURCE_ORIGINAL_ID_ANNOTATION,
)

from api.src.publicDB.resources.schemas import (
    PubResourceCreate,
    PubResourceCreateFork,
    PubResourceCreated,
    PubResourceFile,
    PubResource,
    PubResourceUpdate,
    PubResourceComment,
    PubResourceCommentCreate,
)
from api.src.publicDB.resources.controllers import (
    create_resource,
    upload_resource_file,
    get_resource,
    get_resources,
    get_resource_files,
    delete_resource,
    delete_resource_file,
    update_resource,
    update_resource_status,
    update_resource_public_state,
    create_resource_fork,
    get_resource_comments,
    create_resource_comment,
    delete_resource_comment,
)

from api.database import SessionSqlSessionDependency

router = APIRouter(
    prefix="/resources",
    tags=["Resources"],
    dependencies=[require_role("user")],
)
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
    is_fork: RESOURCE_IS_FORK_ANNOTATION = None,
    original_id: RESROURCE_ORIGINAL_ID_ANNOTATION = None,
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
        is_fork=is_fork,
        original_id=original_id,
    )


@router.get("/{resource_id}", operation_id="get_resource")
async def endp_get_resource(
    resource_id: int, db: SessionSqlSessionDependency
) -> PubResource:
    return get_resource(db, resource_id)


@router.post("", operation_id="create_resource")
async def endp_create_resource(
    resource: PubResourceCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PubResourceCreated:
    return create_resource(db, resource, user)


@router.delete("/{resource_id}", operation_id="delete_resource", status_code=204)
async def endp_delete_resource(
    resource_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_resource(db, resource_id, user)


@router.put("/{resource_id}", operation_id="update_resource")
async def endp_update_resource(
    resource_id: int,
    resource_data: PubResourceUpdate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return update_resource(db, resource_id, resource_data, user)


@router.put("/{resource_id}/status", operation_id="update_resource_status")
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


@router.put("/{resource_id}/public", operation_id="update_resource_public_state")
async def endp_update_resource_public_state(
    resource_id: int,
    is_published: bool,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return update_resource_public_state(db, resource_id, is_published, user)


# ----------- Comment endpoints (komentáře ke schvalování) -----------


@router.get(
    "/{resource_id}/comments",
    operation_id="list_resource_comments",
    dependencies=[require_role("user")],
)
async def endp_list_resource_comments(
    resource_id: int, db: SessionSqlSessionDependency
) -> list[PubResourceComment]:
    return get_resource_comments(db, resource_id)


@router.post(
    "/{resource_id}/comments",
    operation_id="create_resource_comment",
    dependencies=[require_role("guarantor")],
)
async def endp_create_resource_comment(
    resource_id: int,
    data: PubResourceCommentCreate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResourceComment:
    return create_resource_comment(db, resource_id, data, user)


@router.delete(
    "/{resource_id}/comments/{comment_id}",
    operation_id="delete_resource_comment",
    dependencies=[require_role("guarantor")],
)
async def endp_delete_resource_comment(
    resource_id: int,
    comment_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> None:
    delete_resource_comment(db, comment_id, user)


# ----------- File endpoints -----------


@router.get("/{resource_id}/files", operation_id="list_resource_files")
async def endp_get_resource_files(
    resource_id: int, db: SessionSqlSessionDependency
) -> list[PubResourceFile]:
    return get_resource_files(db, resource_id)


@router.get("/{resource_id}/files/{file_id}", operation_id="download_resource_file")
async def endp_download_resource_file(
    resource_id: int, file_id: int, db: SessionSqlSessionDependency
) -> Response:
    """Stáhne soubor materiálu podle ID."""

    resource_file = get_or_404(
        db,
        models.PubResourceFile,
        file_id,
        check_active=False,
        detail="Soubor nenalezen",
    )

    if resource_file.resource_id != resource_id:
        raise HTTPException(status_code=404, detail="Soubor nenalezen")

    try:
        content = seaweedfs.download_file(resource_file.file_path)
    except httpx.HTTPError as e:
        if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail="Soubor už není v úložišti"
            ) from e
        raise HTTPException(
            status_code=502, detail="Úložiště souborů je nedostupné"
        ) from e

    return attachment_response(content, resource_file.filename)


@router.post("/{resource_id}/files", operation_id="upload_resource_file")
async def endp_upload_resource_file(
    resource_id: int,
    user: CurrentUser,
    db: SessionSqlSessionDependency,
    file: UploadFile = File(...),  # noqa: B008
) -> PubResourceFile:
    return await upload_resource_file(db, resource_id, file, user)


@router.delete(
    "/{resource_id}/files/{file_id}",
    operation_id="delete_resource_file",
    status_code=204,
)
async def endp_delete_resource_file(
    resource_id: int, file_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_resource_file(db, resource_id, file_id, user)


# ----------- Fork endpoints -----------


@router.post("/{resource_id}/fork", operation_id="create_resource_fork")
async def endp_create_resource_fork(
    resource_id: int,
    data: PubResourceCreateFork,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResourceCreated:
    return create_resource_fork(db, resource_id, data, user)
