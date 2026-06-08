from fastapi import APIRouter

from api.dependencies import CurrentUser, require_role
from api.database import SessionSqlSessionDependency
from api.src.publicDB.rating.schemas import (
    PubResourceRatingCreate,
    PubResourceRatingCreated,
)
from api.src.publicDB.rating.controllers import (
    create_rating,
    get_rating,
    get_ratings,
    get_resource_ratings,
    update_rating,
    delete_rating,
)

from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    RATING_SCORE_MIN_ANNOTATION,
    RATING_SCORE_MAX_ANNOTATION,
)

router = APIRouter(prefix="/ratings", tags=["Ratings"])


@router.get("", operation_id="get_ratings", dependencies=[require_role("user")])
async def list_ratings(
    db: SessionSqlSessionDependency,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    score_min: RATING_SCORE_MIN_ANNOTATION = None,
    score_max: RATING_SCORE_MAX_ANNOTATION = None,
) -> list[PubResourceRatingCreated]:
    return get_ratings(db, include_inactive, score_min, score_max)


@router.get(
    "/resource/{resource_id}",
    operation_id="get_resource_ratings",
    dependencies=[require_role("user")],
)
async def endp_get_resource_ratings(
    resource_id: int,
    db: SessionSqlSessionDependency,
) -> list[PubResourceRatingCreated]:
    return get_resource_ratings(db, resource_id)


@router.get(
    "/{rating_id}", operation_id="get_rating", dependencies=[require_role("user")]
)
async def endp_get_rating(
    rating_id: int,
    db: SessionSqlSessionDependency,
) -> PubResourceRatingCreated:
    return get_rating(db, rating_id)


@router.post(
    "/{resource_id}",
    operation_id="create_rating",
    dependencies=[require_role("user")],
)
async def endp_create_rating(
    resource_id: int,
    data: PubResourceRatingCreate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResourceRatingCreated:
    return create_rating(db, resource_id, data, user)


@router.put(
    "/{rating_id}",
    operation_id="update_rating",
    dependencies=[require_role("user")],
)
async def endp_update_rating(
    rating_id: int,
    data: PubResourceRatingCreate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResourceRatingCreated:
    return update_rating(db, rating_id, data, user)


@router.delete(
    "/{rating_id}",
    operation_id="delete_rating",
    dependencies=[require_role("user")],
)
async def endp_delete_rating(
    rating_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_rating(db, rating_id, user)
