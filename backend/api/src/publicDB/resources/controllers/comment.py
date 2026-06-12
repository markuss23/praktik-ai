"""
Controllery pro komentáře k veřejným materiálům v rámci schvalování.

Komentář je samostatné vlákno zpětné vazby (bez verdiktu) — garant přidá
komentář k materiálu ve stavu pending_review, vlastník ho vidí např. u
vráceného materiálu a podle něj materiál upraví.
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.enums import PubResourceStatus, UserRole
from api.src.common.utils import get_or_404
from api.authorization import validate_guarantor_or_superadmin
from api.src.publicDB.resources.schemas import (
    PubResourceComment,
    PubResourceCommentCreate,
)


def get_resource_comments(
    db: Session, resource_id: int
) -> list[PubResourceComment]:
    """Vrátí komentáře k materiálu (nejnovější první)."""
    get_or_404(db, models.PubResource, resource_id, detail="Materiál nenalezen")

    stm = (
        select(models.PubResourceComment)
        .options(joinedload(models.PubResourceComment.author))
        .where(
            models.PubResourceComment.resource_id == resource_id,
            models.PubResourceComment.is_active.is_(True),
        )
        .order_by(models.PubResourceComment.comment_id.desc())
    )
    comments = db.execute(stm).scalars().all()
    return [PubResourceComment.model_validate(c) for c in comments]


def create_resource_comment(
    db: Session,
    resource_id: int,
    data: PubResourceCommentCreate,
    user: models.User,
) -> PubResourceComment:
    """Vytvoří komentář garanta k materiálu ve stavu pending_review."""
    resource = get_or_404(
        db, models.PubResource, resource_id, detail="Materiál nenalezen"
    )

    # Komentovat smí pouze garant nebo superadmin (ne vlastník, pokud není superadmin).
    validate_guarantor_or_superadmin(resource, user, "materiál")

    if resource.status != PubResourceStatus.pending_review:
        raise HTTPException(
            status_code=400,
            detail="Komentář lze přidat pouze k materiálu ve stavu pending_review.",
        )

    comment = models.PubResourceComment(
        resource_id=resource_id,
        author_id=user.user_id,
        comment=data.comment,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return PubResourceComment.model_validate(comment)


def delete_resource_comment(
    db: Session, comment_id: int, user: models.User
) -> None:
    """Soft-delete komentáře. Garant smí smazat jen vlastní, superadmin libovolný."""
    comment = get_or_404(
        db, models.PubResourceComment, comment_id, detail="Komentář nenalezen"
    )

    if user.role != UserRole.superadmin and comment.author_id != user.user_id:
        raise HTTPException(
            status_code=403,
            detail="Nemáte oprávnění smazat tento komentář",
        )

    comment.is_active = False
    db.commit()
