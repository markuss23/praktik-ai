from typing import Annotated
from keycloak import (
    KeycloakAuthenticationError,
    KeycloakConnectionError,
    KeycloakOpenID,
)
from fastapi import Depends, HTTPException
from fastapi.security import (
    OAuth2PasswordBearer,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from api.database import get_sql
from api.models import User
from api.enums import UserRole

oauth2_bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

# Keycloak realm role names mapped to our DB UserRole enum
_KC_ROLE_MAP: dict[str, UserRole] = {
    "superadmin": UserRole.superadmin,
    "guarantor": UserRole.guarantor,
    "lector": UserRole.lector,
    "user": UserRole.user,
}


def _decode_jwt_roles(keycloak_openid: KeycloakOpenID, token_str: str) -> list[str]:
    """Decode the JWT access token and return realm role names.

    Falls back to the introspect response if JWT decoding fails.
    """
    # decoding the JWT directly (contains realm_access)
    try:
        decoded: dict = keycloak_openid.decode_token(
            token_str,
            validate=False, 
        )
        roles = decoded.get("realm_access", {}).get("roles", [])
        if roles:
            return roles
    except Exception:
        pass

    try:
        token_info: dict = keycloak_openid.introspect(token_str)
        return token_info.get("realm_access", {}).get("roles", [])
    except Exception:
        return []


def _resolve_role_from_token(keycloak_openid: KeycloakOpenID, token_str: str) -> UserRole:
    """Extract the highest application role from a Keycloak access token.

    Decodes the JWT to read ``realm_access.roles``.
    No KeycloakAdmin / service-account needed.
    """
    realm_roles = _decode_jwt_roles(keycloak_openid, token_str)

    for role_key in ("superadmin", "guarantor", "lector"):
        if role_key in realm_roles:
            return _KC_ROLE_MAP[role_key]

    return UserRole.user


class Auth:
    def __init__(self):
        try:
            self.keycloak_openid = KeycloakOpenID(
                server_url=settings.keycloak.server_url,
                client_id=settings.keycloak.client_id,
                realm_name=settings.keycloak.realm_name,
                client_secret_key=settings.keycloak.client_secret,
            )
        except Exception as e:
            print(f"Warning: Failed to initialize Keycloak: {e}")
            self.keycloak_openid = None

    def get_token(self, username: str, password: str) -> dict:
        try:
            token: dict = self.keycloak_openid.token(
                username=username, password=password, grant_type="password"
            )
            return token
        except KeycloakAuthenticationError as e:
            raise HTTPException(
                status_code=401,
                detail="Neplatné přihlašovací údaje",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e
        except Exception as e:
            print(e)
            raise HTTPException(
                status_code=500,
                detail="Chyba při získávání tokenu z Keycloak",
            ) from e

    def get_current_user(
        self,
        token: Annotated[str, Depends(oauth2_bearer)],
        db: Annotated[Session, Depends(get_sql)],
    ) -> User:
        """Validate token and return the DB user.

        On the very first request for an unknown ``sub`` a new User row is
        created with the role derived from the token's ``realm_access.roles``.
        Subsequent role syncs happen only via the explicit ``/auth/sync``
        endpoint (called by the frontend after PKCE login).
        """
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Neplatné přihlašovací údaje",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            token_info: dict = self.keycloak_openid.introspect(token)
            if not token_info.get("active", False):
                raise HTTPException(
                    status_code=401,
                    detail="Token je neplatný nebo expiroval",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            user_info: dict = self.keycloak_openid.userinfo(token)

        except (KeycloakAuthenticationError, KeycloakConnectionError) as e:
            raise HTTPException(
                status_code=500,
                detail="Autentizace selhala nebo Keycloak není dostupný",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e

        sub: str = user_info["sub"]
        email: str = user_info.get("email", "")
        name: str | None = user_info.get("name")

        user: User | None = db.scalar(select(User).where(User.sub == sub))

        if user is None:
            # First authenticated request — resolve role from the token
            resolved_role = _resolve_role_from_token(self.keycloak_openid, token)
            user = User(sub=sub, email=email, display_name=name, role=resolved_role)
            db.add(user)
            db.commit()

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account deactivated")

        return user

    def sync_user_from_token(self, token_str: str, db: Session) -> User:
        """Create or update a user from a Keycloak access token.

        Called on login (``/auth/token`` and ``/auth/sync``) to ensure the DB
        row mirrors the current Keycloak state (email, name, **role**).
        The role is read from ``realm_access.roles`` inside the JWT — no admin
        API / service-account is required.
        """
        try:
            user_info: dict = self.keycloak_openid.userinfo(token_str)
        except (KeycloakAuthenticationError, KeycloakConnectionError):
            return None

        sub: str = user_info["sub"]
        email: str = user_info.get("email", "")
        name: str | None = user_info.get("name")
        resolved_role: UserRole = _resolve_role_from_token(self.keycloak_openid, token_str)

        user: User | None = db.scalar(select(User).where(User.sub == sub))
        if user is None:
            user = User(sub=sub, email=email, display_name=name, role=resolved_role)
            db.add(user)
        else:
            user.email = email
            user.display_name = name or user.display_name
            user.role = resolved_role
        db.commit()
        db.refresh(user)
        return user


ROLE_HIERARCHY: dict[str, int] = {
    "superadmin": 4,
    "guarantor": 3,
    "lector": 2,
    "user": 1,
}


def require_role(min_role: str):
    min_level: int = ROLE_HIERARCHY.get(min_role, 0)

    def checker(user: Annotated[User, Depends(auth.get_current_user)]):
        user_level = ROLE_HIERARCHY.get(user.role, 0)
        if user_level < min_level:
            raise HTTPException(status_code=403, detail="Nedostatečná oprávnění")

    return Depends(checker)


auth = Auth()
CurrentUser = Annotated[User, Depends(auth.get_current_user)]
