from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404, assert_course_editable
from api.src.activities.schemas import (
    LearnBlock,
    LearnBlockCreate,
    LearnBlockUpdate,
)
from api.authorization import validate_owner_or_superadmin


# ---------- LearnBlock ----------


def create_learn_block(
    db: Session, learn_data: LearnBlockCreate, user: models.User
) -> LearnBlock:
    """Vytvoří LearnBlock — modul smí mít nejvýše jeden aktivní."""
    module = get_or_404(db, models.Module, learn_data.module_id, detail="Modul nenalezen nebo není aktivní")

    validate_owner_or_superadmin(module, user, "modul")
    assert_course_editable(module.course)

    existing = db.execute(
        select(models.LearnBlock).where(
            models.LearnBlock.module_id == learn_data.module_id,
            models.LearnBlock.is_active.is_(True),
        )
    ).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Modul již má aktivní LearnBlock.")

    new_lb = models.LearnBlock(
        module_id=learn_data.module_id,
        title=learn_data.title,
        content=learn_data.content,
    )
    db.add(new_lb)
    try:
        db.commit()
    except IntegrityError:
        # souběžný create prošel kontrolou výše, chytí ho až uq_learnblock_module_active
        db.rollback()
        raise HTTPException(status_code=400, detail="Modul již má aktivní LearnBlock.") from None
    db.refresh(new_lb)

    return LearnBlock.model_validate(new_lb)


def update_learn_block(
    db: Session, learn_id: int, learn_data: LearnBlockUpdate, user: models.User
) -> LearnBlock:
    """Upraví title a content existujícího LearnBlock."""
    learn_block = get_or_404(db, models.LearnBlock, learn_id, detail="LearnBlock nenalezen nebo není aktivní")

    validate_owner_or_superadmin(learn_block, user, "learn block")
    assert_course_editable(learn_block.module.course)

    learn_block.title = learn_data.title
    learn_block.content = learn_data.content
    db.commit()
    db.refresh(learn_block)

    return LearnBlock.model_validate(learn_block)


def delete_learn_block(db: Session, learn_id: int, user: models.User) -> None:
    """Soft-delete LearnBlock."""
    learn_block = get_or_404(db, models.LearnBlock, learn_id, detail="LearnBlock nenalezen nebo není aktivní")

    validate_owner_or_superadmin(learn_block, user, "learn block")
    assert_course_editable(learn_block.module.course)

    learn_block.soft_delete()
    db.commit()
