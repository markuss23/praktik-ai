"""
Contollery pro vytváření hodnocení veřejných materiálů.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.src.publicDB.rating.schemas import (
    PubResourceRatingCreate,
    PubResourceRatingCreated,
)


def create_rating(
    db: Session,
    resource_id: int,
    data: PubResourceRatingCreate,
    user: models.User,
) -> PubResourceRatingCreated:
    """
    Vytvoří hodnocení (1–5) pro veřejný materiál od přihlášeného uživatele.

    """
    get_or_404(db, models.PubResource, resource_id, detail="Materiál nenalezen")

    # kontrola, zdali uzivatel neohodnotil tento material
    existing = db.execute(
        select(models.PubResourceRating).where(
            models.PubResourceRating.resource_id == resource_id,
            models.PubResourceRating.user_id == user.user_id,
            models.PubResourceRating.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Tento materiál jste již ohodnotili.",
        )
    # osetření, aby hodnocení bylo mezi 1 a 5
    if not (1 <= data.score <= 5):
        raise HTTPException(
            status_code=400,
            detail="Hodnocení musí být mezi 1 a 5.",
        )

    rating = models.PubResourceRating(
        resource_id=resource_id,
        user_id=user.user_id,
        score=data.score,
        comment=data.comment,
    )
    db.add(rating)
    db.commit()

    db.refresh(rating)

    return PubResourceRatingCreated.model_validate(rating)
