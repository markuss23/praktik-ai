from sqlalchemy import desc, select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from api import models
from api.src.common.utils import get_or_404
from api.enums import PubResourceStatus, UserRole
from api.authorization import validate_guarantor_or_superadmin


def delete_review(db: Session, review_id: int, user: models.User) -> None:
    """Soft smaže recenzi a vrátí materiál k posouzení.

    Smazat lze jen poslední aktivní recenzi materiálu, protože jen ta určuje
    jeho aktuální stav.

    """
    review = get_or_404(
        db, models.PubResourceReview, review_id, detail="Recenze nenalezena"
    )

    validate_guarantor_or_superadmin(review, user, "recenze")

    resource = get_or_404(
        db, models.PubResource, review.resource_id, detail="Materiál nenalezen"
    )

    # Garant smí smazat jen svoji recenzi, superadmin jakoukoli.
    if user.role != UserRole.superadmin and review.reviewer_id != user.user_id:
        raise HTTPException(
            status_code=403,
            detail="Nelze smazat recenzi, kterou jste nevytvořil.",
        )

    # Smazat jde jen poslední aktivní recenzi
    latest_review_id = db.execute(
        select(models.PubResourceReview.review_id)
        .where(
            models.PubResourceReview.resource_id == review.resource_id,
            models.PubResourceReview.is_active.is_(True),
        )
        .order_by(
            desc(models.PubResourceReview.reviewed_at),
            desc(models.PubResourceReview.review_id),
        )
        .limit(1)
    ).scalar_one()
    if review.review_id != latest_review_id:
        raise HTTPException(
            status_code=400,
            detail="Smazat lze pouze poslední recenzi materiálu.",
        )

    resource.status = PubResourceStatus.pending_review
    resource.is_public = False

    review.soft_delete()
    db.commit()
