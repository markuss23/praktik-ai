"""
Controllery pro čtení hodnocení veřejných materiálů.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.src.common.utils import get_or_404
from api.src.publicDB.rating.schemas import PubResourceRating


def get_ratings(
    db: Session,
    include_inactive: bool = False,
    score_min: int | None = None,
    score_max: int | None = None,
) -> list[PubResourceRating]:
    """Vrátí seznam hodnocení s filtrací."""

    stm = (
        select(models.PubResourceRating)
        .options(joinedload(models.PubResourceRating.user))
        .order_by(models.PubResourceRating.rating_id.desc())
    )

    if not include_inactive:
        stm = stm.where(models.PubResourceRating.is_active.is_(True))

    if score_min is not None:
        stm = stm.where(models.PubResourceRating.score >= score_min)

    if score_max is not None:
        stm = stm.where(models.PubResourceRating.score <= score_max)

    results = db.execute(stm).scalars().all()
    return [PubResourceRating.model_validate(r) for r in results]


def get_rating(db: Session, rating_id: int) -> PubResourceRating:
    """Vrátí detail hodnocení podle ID."""

    result = db.execute(
        select(models.PubResourceRating)
        .options(joinedload(models.PubResourceRating.user))
        .where(models.PubResourceRating.rating_id == rating_id)
    ).scalar_one_or_none()

    if result is None:
        get_or_404(
            db,
            models.PubResourceRating,
            rating_id,
            detail="Hodnocení nenalezeno",
            check_active=False,
        )

    return PubResourceRating.model_validate(result)


def get_resource_ratings(db: Session, resource_id: int) -> list[PubResourceRating]:
    """Vrátí seznam hodnocení pro daný veřejný materiál."""

    get_or_404(db, models.PubResource, resource_id, detail="Materiál nenalezen")

    results = (
        db.execute(
            select(models.PubResourceRating)
            .options(joinedload(models.PubResourceRating.user))
            .where(
                models.PubResourceRating.resource_id == resource_id,
                models.PubResourceRating.is_active.is_(True),
            )
            .order_by(models.PubResourceRating.rating_id.desc())
        )
        .scalars()
        .all()
    )

    return [PubResourceRating.model_validate(r) for r in results]
