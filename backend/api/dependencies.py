from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated

from keycloak import (
    KeycloakAdmin,
    KeycloakAuthenticationError,
    KeycloakConnectionError,
    KeycloakOpenID,
    KeycloakOpenIDConnection,
)
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from api.database import get_sql
from api.models import User
from api.enums import UserRole

log = logging.getLogger(__name__)

oauth2_bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

# Keycloak realm role names → DB enum
_KC_ROLE_MAP: dict[str, UserRole] = {
    "superadmin": UserRole.superadmin,
    "guarantor": UserRole.guarantor,
    "lector": UserRole.lector,
    "user": UserRole.user,
}

# Priority order (index = weight, higher wins)
_ROLE_PRIORITY: list[str] = ["user", "lector", "guarantor", "superadmin"]


def _resolve_highest_role(role_names: list[str]) -> UserRole:
    """Pick the highest application role from a list of realm role names."""
    best = UserRole.user
    best_idx = 0
    for name in role_names:
        if name in _KC_ROLE_MAP:
            idx = _ROLE_PRIORITY.index(name)
            if idx > best_idx:
                best_idx = idx
                best = _KC_ROLE_MAP[name]
    return best


def _get_admin_client() -> KeycloakAdmin:
    """Create a KeycloakAdmin authenticated via client credentials.

    Both authentication and queries happen in the same realm (praktikai-dev).
    The 'app' client must have Service Accounts Enabled + realm-management roles.
    """
    connection = KeycloakOpenIDConnection(
        server_url=settings.keycloak.server_url,
        client_id=settings.keycloak.client_id,
        client_secret_key=settings.keycloak.client_secret,
        realm_name=settings.keycloak.realm_name,
    )
    return KeycloakAdmin(connection=connection)


def _fetch_roles_from_admin_api(user_sub: str) -> UserRole:
    """Fetch realm roles for a user via Keycloak Admin REST API.

    Falls back to UserRole.user if the Admin API is unreachable.
    """
    try:
        admin = _get_admin_client()
        realm_roles = admin.get_realm_roles_of_user(user_id=user_sub)
        role_names = [r["name"] for r in realm_roles]
        return _resolve_highest_role(role_names)
    except Exception:
        log.exception("Failed to fetch roles from Admin API for user %s", user_sub)
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

        Token is used ONLY for authentication (identity via sub).
        Roles are NEVER read from the JWT — they come from the DB
        (synced via Admin API on login).
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
            # First request — sync role from Admin API
            resolved_role = _fetch_roles_from_admin_api(sub)
            user = User(
                sub=sub,
                email=email,
                display_name=name,
                role=resolved_role,
                last_synced_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.commit()

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account deactivated")

        return user

    def sync_user_from_token(self, token_str: str, db: Session) -> User:
        """Create or update a user from a Keycloak access token.

        Called on login (/auth/token and /auth/sync).
        JWT is used only to identify the user (sub).
        Roles are fetched from Keycloak Admin REST API.
        """
        try:
            user_info: dict = self.keycloak_openid.userinfo(token_str)
        except (KeycloakAuthenticationError, KeycloakConnectionError):
            return None

        sub: str = user_info["sub"]
        email: str = user_info.get("email", "")
        name: str | None = user_info.get("name")
        resolved_role: UserRole = _fetch_roles_from_admin_api(sub)
        now = datetime.now(timezone.utc)

        user: User | None = db.scalar(select(User).where(User.sub == sub))
        if user is None:
            user = User(
                sub=sub,
                email=email,
                display_name=name,
                role=resolved_role,
                last_synced_at=now,
            )
            db.add(user)
        else:
            user.email = email
            user.display_name = name or user.display_name
            user.role = resolved_role
            user.last_synced_at = now
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
