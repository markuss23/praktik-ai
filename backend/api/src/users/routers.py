from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import require_role
from api.src.users.controllers import (
    get_user_role,
    list_users,
)
from api.src.users.schemas import UserRoleResponse, UserWithRole

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[require_role("superadmin")],
)


@router.get("", operation_id="list_users")
def endp_list_users(
    db: SessionSqlSessionDependency,
) -> list[UserWithRole]:
    """Vrátí seznam všech aktivních uživatelů s jejich rolemi."""
    return list_users(db=db)


@router.get("/{user_id}/role", operation_id="get_user_role")
def endp_get_user_role(
    user_id: int,
    db: SessionSqlSessionDependency,
) -> UserRoleResponse:
    """Vrátí roli konkrétního uživatele."""
    return get_user_role(db=db, user_id=user_id)
