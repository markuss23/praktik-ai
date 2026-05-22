from fastapi import HTTPException
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.src.reviews.schemas import PubResourceReviewCreate
from api.enums import PubResourceStatus, ReviewVerdict
from api.authorization import validate_guarantor_or_superadmin
from api.src.resources.schemas import PubResource


def review_resource(
    db: Session,
    resource_id: int,
    review_data: PubResourceReviewCreate,
    user: models.User,
) -> PubResource:
    """Vytvoří recenzi a podle verdiktu změní status materiálu."""
    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    validate_guarantor_or_superadmin(resource, user, "materiál")

    if resource.status != PubResourceStatus.pending_review:
        raise HTTPException(
            status_code=400,
            detail="Recenze lze provést pouze pro materiály ve stavu pending_review.",
        )

    review = models.PubResourceReview(
        resource_id=resource_id,
        reviewer_id=user.user_id,
        verdict=review_data.verdict,
        notes=review_data.notes,
    )
    db.add(review)

    if review_data.verdict == ReviewVerdict.approved:
        resource.status = PubResourceStatus.approved
    elif review_data.verdict == ReviewVerdict.rejected:
        resource.status = PubResourceStatus.rejected
    elif review_data.verdict == ReviewVerdict.needs_revision:
        resource.status = PubResourceStatus.rejected

    db.commit()
    db.refresh(resource)

    return PubResource.model_validate(resource)
