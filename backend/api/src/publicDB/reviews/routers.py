from fastapi import APIRouter

from api.dependencies import CurrentUser, require_role
from api.src.publicDB.resources.schemas import PubResource
from api.enums import ReviewVerdict
from api.database import SessionSqlSessionDependency
from api.src.publicDB.reviews.schemas import PubResourceReview, PubResourceReviewCreate
from api.src.publicDB.reviews.controllers import (
    create_review,
    get_review,
    get_reviews,
    delete_review,
)


router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("", operation_id="list_reviews")
async def list_reviews(
    db: SessionSqlSessionDependency,
    include_inactive: bool = False,
    verdict: ReviewVerdict | None = None,
    resource_id: int | None = None,
    reviewer_id: int | None = None,
) -> list[PubResourceReview]:
    return get_reviews(
        db,
        include_inactive=include_inactive,
        verdict=verdict,
        resource_id=resource_id,
        reviewer_id=reviewer_id,
    )


@router.get(
    "/{review_id}", operation_id="get_review", dependencies=[require_role("user")]
)
async def endp_get_review(
    review_id: int,
    db: SessionSqlSessionDependency,
) -> PubResourceReview:
    return get_review(db, review_id)


@router.post(
    "/{resource_id}/create",
    operation_id="create_review",
    dependencies=[require_role("guarantor")],
)
async def endp_create_review(
    resource_id: int,
    review: PubResourceReviewCreate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return create_review(db, resource_id, review, user)


@router.delete(
    "/{review_id}",
    operation_id="delete_review",
    dependencies=[require_role("guarantor")],
)
async def endp_delete_review(
    review_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_review(db, review_id, user)
