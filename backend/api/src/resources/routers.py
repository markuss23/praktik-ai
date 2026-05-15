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

from api.src.resources.schemas import (
    PubResourceCreate,
    PubResourceCreated,
    PubResourceFile,
    PubResource,
)
from api.src.resources.controllers import (
    create_resource,
    upload_resource_file,
    get_resource,
    get_resources,
)

from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/resources", tags=["Resources"])

# ----------- Resource endpoints -----------


@router.get("", operation_id="list_resources")
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


@router.post("", operation_id="create_resource", dependencies=[require_role("lector")] )
async def endp_create_resource(
    resource: PubResourceCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PubResourceCreated:
    return create_resource(db, resource, user)


@router.get("/{resource_id}", operation_id="get_resource", dependencies=[require_role("lector")])
async def endp_get_resource(
    resource_id: int, db: SessionSqlSessionDependency
) -> PubResource:
    return get_resource(db, resource_id)


# ----------- File endpoints -----------


@router.post("/{resource_id}/files", operation_id="upload_resource_file", dependencies=[require_role("lector")] )
async def endp_upload_resource_file(
    resource_id: int,
    user: CurrentUser,
    db: SessionSqlSessionDependency,
    file: UploadFile = File(...),
) -> PubResourceFile:
    return await upload_resource_file(db, resource_id, file, user)
