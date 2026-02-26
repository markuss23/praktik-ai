from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from api.dependencies import CurrentUser, RealmRoles, auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token")
def endp_token(
    user_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> dict:
    return auth.get_token(user_data.username, user_data.password)


@router.get("/me")
def endp_me(current_user: CurrentUser) -> dict:
    return current_user


@router.get("/roles")
def endp_roles(roles: RealmRoles) -> list:
    return roles
