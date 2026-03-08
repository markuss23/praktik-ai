from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.users.controllers import (
    get_user_role,
    list_users,
    reset_user_role,
    set_user_role,
)
from api.src.users.schemas import UserRoleResponse, UserRoleUpdate, UserWithRole

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    # require_role("superadmin") zajišťuje, že endpoint smí volat výhradně superadmin
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


@router.put("/{user_id}/role", operation_id="set_user_role")
def endp_set_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    db: SessionSqlSessionDependency,
    current_user: CurrentUser,
) -> UserRoleResponse:
    """Nastaví roli uživatele. Role superadmina nelze měnit."""
    return set_user_role(db=db, user_id=user_id, role_data=role_data, actor=current_user)


@router.delete("/{user_id}/role", operation_id="delete_user_role")
def endp_delete_user_role(
    user_id: int,
    db: SessionSqlSessionDependency,
    current_user: CurrentUser,
) -> UserRoleResponse:
    """Resetuje roli uživatele na výchozí hodnotu (user). Role superadmina nelze resetovat."""
    return reset_user_role(db=db, user_id=user_id, actor=current_user)
