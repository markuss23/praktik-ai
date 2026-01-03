from fastapi import APIRouter
from api.models import ActivityKind
from api.src.activities.controllers import (
    create_activity,
    get_activities,
    get_activity,
    update_activity,
)
from api.src.activities.schemas import ActivityCreate, Activity
from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)

from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("", operation_id="list_activities")
async def list_activities(
    db: SessionSqlSessionDependency,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
    module_id: int | None = None,
    kind: ActivityKind | None = None,
) -> list[Activity]:
    return get_activities(
        db,
        include_inactive=include_inactive,
        text_search=text_search,
        module_id=module_id,
        kind=kind,
    )


@router.post("", operation_id="create_activity")
async def endp_create_activity(
    activity: ActivityCreate, db: SessionSqlSessionDependency
) -> Activity:
    return create_activity(db, activity)


@router.get("/{activity_id}", operation_id="get_activity")
async def endp_get_activity(
    activity_id: int, db: SessionSqlSessionDependency
) -> Activity:
    return get_activity(db, activity_id)


@router.put("/{activity_id}", operation_id="update_activity")
async def endp_update_activity(
    activity_id: int, activity: ActivityCreate, db: SessionSqlSessionDependency
) -> Activity:
    return update_activity(db, activity_id, activity)
