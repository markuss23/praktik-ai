"""
Controllery pro editaci veřejných materiálů.
"""

from fastapi import HTTPException
from sqlalchemy import update, select, desc
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import PubResourceStatus, ReviewVerdict
from api.src.publicDB.resources.schemas import (
    PubResource,
    PubResourceUpdate,
)
from api.authorization import validate_owner_or_superadmin


def update_resource(
    db: Session, resource_id: int, resource_data: PubResourceUpdate, user: models.User
) -> PubResource:
    """Aktualizuje existující veřejný materiál (v draft stavu)"""

    # Kontrola existence pro obor a cílovou skupinu
    if (
        db.execute(
            select(models.CourseSubject).where(
                models.CourseSubject.subject_id == resource_data.subject_id,
                models.CourseSubject.is_active.is_(True),
            )
        ).first()
        is None
    ):
        raise HTTPException(status_code=400, detail="Obor s tímto ID neexistuje")

    if (
        db.execute(
            select(models.CourseTarget).where(
                models.CourseTarget.target_id == resource_data.target_id,
                models.CourseTarget.is_active.is_(True),
            )
        ).first()
        is None
    ):
        raise HTTPException(
            status_code=400, detail="Cílová skupina s tímto ID neexistuje"
        )

    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    # Ošetření pro fork
    if resource.is_fork:
        if (
            resource_data.subject_id != resource.subject_id
            and resource_data.target_id != resource.target_id
            and resource_data.education_level != resource.education_level
            and resource_data.difficulty_level != resource.difficulty_level
        ):
            raise HTTPException(
                status_code=400,
                detail="U forků není možné měnit obor, cílovou skupinu, vzdělávací úroveň a obtížnost zároveň",
            )
    # Pouze vlastník nebo superadmin může upravovat materiál
    validate_owner_or_superadmin(resource, user, "materiál")

    # U materiálů ve stavu rejected musí být poslední recenze needs_revision, aby bylo možné upravovat
    if resource.status == PubResourceStatus.rejected:
        latest_review = (
            db.execute(
                select(models.PubResourceReview)
                .where(
                    models.PubResourceReview.resource_id == resource_id,
                    models.PubResourceReview.is_active.is_(True),
                )
                .order_by(desc(models.PubResourceReview.reviewed_at))
                .limit(1)
            )
            .scalars()
            .first()
        )

        if (
            latest_review is None
            or latest_review.verdict != ReviewVerdict.needs_revision
        ):
            raise HTTPException(
                status_code=403,
                detail="Materiál ve stavu rejected lze upravovat pouze při verdiktu needs_revision",
            )
    elif resource.status != PubResourceStatus.draft:
        raise HTTPException(
            status_code=400,
            detail="Lze upravit pouze materiály ve stavu draft nebo rejected s verdiktem needs_revision",
        )

    update_data = resource_data.model_dump(exclude_unset=True)

    db.execute(
        update(models.PubResource)
        .where(models.PubResource.resource_id == resource_id)
        .values(**update_data)
    )
    db.commit()
    db.refresh(resource)

    return PubResource.model_validate(resource)


def update_resource_status(
    db: Session,
    resource_id: int,
    new_status: PubResourceStatus,
    user: models.User,
) -> PubResource:
    """Aktualizuje status veřejného materiálu."""
    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    valid_status_transitions = {
        PubResourceStatus.draft: PubResourceStatus.pending_review,
        PubResourceStatus.rejected: PubResourceStatus.pending_review,
    }

    allowed_status_change = valid_status_transitions.get(resource.status, set())

    if new_status not in allowed_status_change:
        raise HTTPException(
            status_code=400,
            detail=f"Neplatný přechod statusu z {resource.status} na {new_status}",
        )
    # Pokud je material rejected s verdiktem rejected nepujde poslat k recenzi
    if resource.status == PubResourceStatus.rejected:
        latest_review = (
            db.execute(
                select(models.PubResourceReview)
                .where(
                    models.PubResourceReview.resource_id == resource_id,
                    models.PubResourceReview.is_active.is_(True),
                )
                .order_by(desc(models.PubResourceReview.reviewed_at))
                .limit(1)
            )
            .scalars()
            .first()
        )

        if (
            latest_review is None
            or latest_review.verdict != ReviewVerdict.needs_revision
        ):
            raise HTTPException(
                status_code=403,
                detail="Materiál s verdiktem rejected nelze znovu odeslat k recenzi",
            )

    # Pouze vlastník nebo superadmin může posílat materiál k recenzi
    validate_owner_or_superadmin(resource, user, "materiál")

    db.execute(
        update(models.PubResource)
        .where(models.PubResource.resource_id == resource_id)
        .values(status=new_status)
    )
    db.commit()
    db.refresh(resource)

    return PubResource.model_validate(resource)


def update_resource_public_state(
    db: Session, resource_id: int, is_published: bool, user: models.User
) -> PubResource:
    """Aktualizuje veřejný stav materiálu"""

    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    # Pouze vlastník nebo superadmin může měnit veřejný stav materiálu
    validate_owner_or_superadmin(resource, user, "materiál")

    if resource.status != PubResourceStatus.approved:
        raise HTTPException(
            status_code=400,
            detail="Lze změnit veřejný stav pouze pro schválené materiály",
        )

    if is_published == resource.is_public:
        raise HTTPException(
            status_code=400,
            detail="Material je už veřejný"
            if is_published
            else "Material je už privátní",
        )

    db.execute(
        update(models.PubResource)
        .where(models.PubResource.resource_id == resource_id)
        .values(is_public=is_published)
    )
    db.commit()
    db.refresh(resource)

    return PubResource.model_validate(resource)
