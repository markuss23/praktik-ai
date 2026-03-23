from fastapi import HTTPException
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.enums import UserRole
from api.src.users.schemas import UserRoleResponse, UserRoleUpdate, UserWithRole

from sqlalchemy import select


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


def set_user_role(
    db: Session, user_id: int, role_data: UserRoleUpdate, actor: models.User
) -> UserRoleResponse:
    """
    Nastaví roli uživatele.
    Role uživatele s rolí superadmin nelze měnit.
    """
    user = get_or_404(db, models.User, user_id, detail="Uživatel nenalezen")

    # Roli superadmina nelze měnit (ani samotným superadminem)
    if user.role == UserRole.superadmin:
        raise HTTPException(
            status_code=400,
            detail="Role uživatele s rolí superadmin nelze měnit",
        )

    user.role = role_data.role
    db.commit()
    db.refresh(user)
    return UserRoleResponse.model_validate(user)


def reset_user_role(db: Session, user_id: int, actor: models.User) -> UserRoleResponse:
    """
    Resetuje roli uživatele na výchozí hodnotu (user).
    Role uživatele s rolí superadmin nelze resetovat.
    """
    user = get_or_404(db, models.User, user_id, detail="Uživatel nenalezen")

    # Roli superadmina nelze měnit (ani samotným superadminem)
    if user.role == UserRole.superadmin:
        raise HTTPException(
            status_code=400,
            detail="Role uživatele s rolí superadmin nelze měnit",
        )

    user.role = UserRole.user
    db.commit()
    db.refresh(user)
    return UserRoleResponse.model_validate(user)
