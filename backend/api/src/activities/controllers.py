from fastapi import HTTPException
from sqlalchemy import select, update, and_
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
    db.commit()
    db.refresh(new_lb)

    return LearnBlock.model_validate(new_lb)


def update_learn_block(
    db: Session, learn_id: int, learn_data: LearnBlockUpdate, user: models.User
) -> LearnBlock:
    """Upraví title a content existujícího LearnBlock."""
    learn_block = get_or_404(db, models.LearnBlock, learn_id, detail="LearnBlock nenalezen nebo není aktivní")

    validate_owner_or_superadmin(learn_block, user, "learn block")
    assert_course_editable(learn_block.module.course)

    # Kontrola unikátnosti title (pokud se mění)
    if learn_data.title != learn_block.title:
        conflict = db.execute(
            select(models.LearnBlock).where(
                and_(
                    models.LearnBlock.module_id == learn_block.module_id,
                    models.LearnBlock.title == learn_data.title,
                    models.LearnBlock.is_active.is_(True),
                    models.LearnBlock.learn_id != learn_id,
                )
            )
        ).first()
        if conflict is not None:
            raise HTTPException(status_code=400, detail="LearnBlock s tímto názvem pro daný modul již existuje.")

    db.execute(
        update(models.LearnBlock)
        .where(models.LearnBlock.learn_id == learn_id)
        .values(**learn_data.model_dump())
    )
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
