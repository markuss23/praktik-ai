from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import PubResourceStatus
from api.authorization import validate_guarantor_or_superadmin


def delete_review(db: Session, review_id: int, user: models.User) -> None:
    review = get_or_404(
        db, models.PubResourceReview, review_id, detail="Recenze nenalezena"
    )

    validate_guarantor_or_superadmin(review, user, "recenze")

    resource = get_or_404(
        db, models.PubResource, review.resource_id, detail="Materiál nenalezen"
    )

    resource.status = PubResourceStatus.pending_review
    db.delete(review)
    db.commit()
