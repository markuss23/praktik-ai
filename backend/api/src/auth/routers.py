from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, RealmRoles, auth
from api.src.auth.schemas import ProfileUpdate, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token")
def endp_token(
    user_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionSqlSessionDependency,
) -> dict:
    token = auth.get_token(user_data.username, user_data.password)
    auth.upsert_user(token["access_token"], db)
    return token


@router.get("/me")
def endp_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.put("/profile")
def endp_update_profile(
    data: ProfileUpdate,
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> UserResponse:
    """Aktualizuje AI preference profilu přihlášeného uživatele."""
    current_user.ai_tone = data.ai_tone
    current_user.ai_expression_level = data.ai_expression_level
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/roles")
def endp_roles(roles: RealmRoles) -> list:
    return roles
