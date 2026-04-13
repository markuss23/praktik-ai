from sqlalchemy.orm import Session
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
