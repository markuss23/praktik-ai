from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, auth, oauth2_bearer
from api.src.auth.schemas import ProfileNameUpdate, UserResponse
from api.src.users.controllers import get_user_ai_style, update_user_ai_style

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token")
def endp_token(
    user_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionSqlSessionDependency,
) -> dict:
    token = auth.get_token(user_data.username, user_data.password)
    auth.sync_user_from_token(token["access_token"], db)
    return token


@router.post("/sync")
def endp_sync(
    token: Annotated[str, Depends(oauth2_bearer)],
    db: SessionSqlSessionDependency,
) -> UserResponse:
    """Called after PKCE login to sync user from Keycloak token to DB."""
    user = auth.sync_user_from_token(token, db)
    if user is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Token sync failed")
    return UserResponse.model_validate(user)


@router.get("/me")
def endp_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("/profile/ai-style")
def endp_get_profile_ai_style(
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> dict[str, str]:
    """Vrátí AI styl přihlášeného uživatele jako {kód osy: kód nastavení}."""
    return {o.axis.code: o.code for o in get_user_ai_style(db, current_user.user_id)}


@router.patch("/profile/ai-style")
def endp_update_profile_ai_style(
    data: dict[str, str],
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> dict[str, str]:
    """Změní AI styl přihlášeného uživatele, např. {"ton": "ton.frnd"}; neuvedené osy zůstanou."""
    update_user_ai_style(db, current_user.user_id, data)
    return {o.axis.code: o.code for o in get_user_ai_style(db, current_user.user_id)}


@router.put("/profile/name")
def endp_update_profile_name(
    data: ProfileNameUpdate,
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> UserResponse:
    """Aktualizuje zobrazované jméno profilu přihlášeného uživatele."""
    current_user.display_name = data.display_name
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
