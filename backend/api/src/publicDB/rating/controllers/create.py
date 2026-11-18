"""
Contollery pro vytváření hodnocení veřejných materiálů.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.enums import PubResourceStatus
from api.src.publicDB.resources.visibility import ensure_resource_visible
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
    # Hodnotit jde jen materiál, který uživatel smí vidět (jinak 404),
    # a jen aktivní (superadmin vidí i smazané).
    resource = ensure_resource_visible(db, resource_id, user)
    if not resource.is_active:
        raise HTTPException(status_code=404, detail="Materiál nenalezen")

    # ošetření aby užívatel si nehodnotil svůj vlastní materiál
    if resource.author_id == user.user_id:
        raise HTTPException(
            status_code=403,
            detail="Nelze hodnotit svůj vlastní materiál.",
        )

    # kontrola, zdali uzivatel neohodnotil tento material
    existing = db.execute(
        select(models.PubResourceRating).where(
            models.PubResourceRating.resource_id == resource_id,
            models.PubResourceRating.user_id == user.user_id,
            models.PubResourceRating.is_active.is_(True),
        )
    ).scalar_one_or_none()

    # kontrola zda je materiál ve stavu approved (v jiném stavu hodnotit nelze)
    if resource.status != PubResourceStatus.approved:
        raise HTTPException(
            status_code=400,
            detail="Hodnocení lze přidat pouze k materiálu ve stavu approved.",
        )

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
