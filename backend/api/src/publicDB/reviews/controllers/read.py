"""
Controllery pro čtení recenzí.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api.enums import ReviewVerdict
from api import models
from api.src.common.utils import get_or_404
from api.src.publicDB.reviews.schemas import PubResourceReview


def get_reviews(
    db: Session,
    include_inactive: bool = False,
    verdict: ReviewVerdict | None = None,
    resource_id: int | None = None,
    reviewer_id: int | None = None,
) -> list[PubResourceReview]:
    """Vrátí seznam recenzí."""

    stm = (
        select(models.PubResourceReview)
        .options(joinedload(models.PubResourceReview.reviewer))
        .order_by(models.PubResourceReview.review_id.desc())
    )

    if not include_inactive:
        stm = stm.where(models.PubResourceReview.is_active.is_(True))

    if verdict:
        stm = stm.where(models.PubResourceReview.verdict == verdict)

    if resource_id is not None:
        stm = stm.where(models.PubResourceReview.resource_id == resource_id)

    if reviewer_id is not None:
        stm = stm.where(models.PubResourceReview.reviewer_id == reviewer_id)

    reviews = db.execute(stm).scalars().all()
    return [PubResourceReview.model_validate(r) for r in reviews]


def get_review(db: Session, review_id: int) -> PubResourceReview:
    """Vrátí recenzi podle ID."""

    stm = (
        select(models.PubResourceReview)
        .options(joinedload(models.PubResourceReview.reviewer))
        .where(models.PubResourceReview.review_id == review_id)
    )

    result = db.execute(stm).scalars().first()

    if result is None:
        get_or_404(
            db,
            models.PubResourceReview,
            review_id,
            detail="Recenze nenalezena",
            check_active=False,
        )

    return PubResourceReview.model_validate(result)
