from fastapi import APIRouter

from api.dependencies import CurrentUser, require_role
from api.src.reviews.controllers import review_resource
from api.src.reviews.schemas import PubResourceReviewCreate
from api.src.resources.schemas import PubResource
from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post(
    "/{resource_id}/review",
    operation_id="review_resource",
    dependencies=[require_role("guarantor")],
)
async def endp_review_resource(
    resource_id: int,
    review: PubResourceReviewCreate,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> PubResource:
    return review_resource(db, resource_id, review, user)
