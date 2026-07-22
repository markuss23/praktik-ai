"""
Contollery pro mazání hodnocení veřejných materiálů.
"""

from sqlalchemy import delete
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404

from api.authorization import validate_owner_or_superadmin


def delete_rating(db: Session, rating_id: int, user: models.User) -> None:
    """Smaže hodnocení pro veřejný materiál od přihlášeného uživatele."""

    rating = get_or_404(
        db,
        models.PubResourceRating,
        rating_id,
        detail="Hodnocení nenalezeno",
    )

    validate_owner_or_superadmin(rating, user, "hodnocení")

    db.execute(
        delete(models.PubResourceRating).where(
            models.PubResourceRating.rating_id == rating_id
        )
    )
    db.commit()
