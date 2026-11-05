from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from api import models
from api.src.common.utils import get_or_404
from api.src.users.schemas import UserRoleResponse, UserWithRole


def list_users(db: Session) -> list[UserWithRole]:
    """Vrátí seznam všech aktivních uživatelů s jejich rolemi."""
    users = (
        db.execute(
            select(models.User)
            .where(models.User.is_active.is_(True))
            .order_by(models.User.user_id)
        )
        .scalars()
        .all()
    )
    return [UserWithRole.model_validate(u) for u in users]


def get_user_role(db: Session, user_id: int) -> UserRoleResponse:
    """Vrátí roli konkrétního uživatele."""
    user = get_or_404(db, models.User, user_id, detail="Uživatel nenalezen")
    return UserRoleResponse.model_validate(user)


def get_user_ai_style(db: Session, user_id: int) -> list[models.AiStyleOption]:
    """Nastavení AI stylu uživatele po osách; u nezvolené osy výchozí nastavení."""
    chosen = dict(
        db.execute(
            select(models.UserAiStyle.axis_id, models.UserAiStyle.option_id).where(
                models.UserAiStyle.user_id == user_id
            )
        ).all()
    )
    axes = db.scalars(
        select(models.AiStyleAxis)
        .options(selectinload(models.AiStyleAxis.options))
        .where(models.AiStyleAxis.is_active.is_(True))
        .order_by(models.AiStyleAxis.axis_id)
    ).all()

    result = []
    for axis in axes:
        option = next(
            (o for o in axis.options if o.option_id == chosen.get(axis.axis_id)),
            None,
        ) or next((o for o in axis.options if o.is_default), None)
        if option:
            result.append(option)
    return result


def update_user_ai_style(db: Session, user_id: int, data: dict[str, str]) -> None:
    """Uloží volbu {kód osy: kód nastavení}; neuvedené osy se nemění."""
    options = {
        o.code: o
        for o in db.scalars(
            select(models.AiStyleOption)
            .options(selectinload(models.AiStyleOption.axis))
            .where(
                models.AiStyleOption.code.in_(data.values()),
                models.AiStyleOption.is_active.is_(True),
            )
        )
    }
    invalid = [
        f"{axis_code}={option_code}"
        for axis_code, option_code in data.items()
        if option_code not in options
        or not options[option_code].axis.is_active
        or options[option_code].axis.code != axis_code
    ]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Neplatné nastavení AI stylu: {', '.join(invalid)}",
        )

    existing = {
        row.axis_id: row
        for row in db.scalars(
            select(models.UserAiStyle).where(models.UserAiStyle.user_id == user_id)
        )
    }
    for option_code in data.values():
        option = options[option_code]
        if option.axis_id in existing:
            existing[option.axis_id].option_id = option.option_id
        else:
            db.add(
                models.UserAiStyle(
                    user_id=user_id, axis_id=option.axis_id, option_id=option.option_id
                )
            )
    db.commit()
