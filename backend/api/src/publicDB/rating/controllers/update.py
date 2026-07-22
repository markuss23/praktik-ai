"""
Contollery pro upravení hodnocení veřejných materiálů.
"""

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.src.publicDB.rating.schemas import PubResourceRatingUpdate, PubResourceRating

from api.authorization import validate_owner_or_superadmin


def update_rating(
    db: Session,
    rating_id: int,
    data: PubResourceRatingUpdate,
    user: models.User,
) -> PubResourceRating:
    """
    Aktualizuje hodnocení (1–5) pro veřejný materiál od přihlášeného uživatele.

    """
    rating = get_or_404(
        db,
        models.PubResourceRating,
        rating_id,
        detail="Hodnocení nenalezeno",
    )

    validate_owner_or_superadmin(rating, user, "hodnocení")

    # osetření, aby hodnocení bylo mezi 1 a 5
    if not (1 <= data.score <= 5):
        raise HTTPException(
            status_code=400,
            detail="Hodnocení musí být mezi 1 a 5.",
        )

    update_data = data.model_dump(exclude_unset=True)

    db.execute(
        update(models.PubResourceRating)
        .where(models.PubResourceRating.rating_id == rating_id)
        .values(**update_data)
    )

    db.commit()
    db.refresh(rating)
    return PubResourceRating.model_validate(rating)
