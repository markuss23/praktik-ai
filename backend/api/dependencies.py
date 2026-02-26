from typing import Annotated
from keycloak import (
    KeycloakAuthenticationError,
    KeycloakConnectionError,
    KeycloakOpenID,
    KeycloakAdmin,
)
from fastapi import Depends, HTTPException
from fastapi.security import (
    OAuth2PasswordBearer,
)
from .config import settings

oauth2_bearer = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


class Auth:
    def __init__(self):
        try:
            self.keycloak_openid = KeycloakOpenID(
                server_url=settings.keycloak.server_url,
                client_id=settings.keycloak.client_id,
                realm_name=settings.keycloak.realm_name,
                client_secret_key=settings.keycloak.client_secret,
            )

            self.keycloak_admin = KeycloakAdmin(
                server_url=settings.keycloak.server_url,
                realm_name=settings.keycloak.realm_name,
                client_id=settings.keycloak.client_id,
                client_secret_key=settings.keycloak.client_secret,
                verify=True,
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

    def get_current_user(self, token: Annotated[str, Depends(oauth2_bearer)]) -> dict:
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
            return user_info

        except (KeycloakAuthenticationError, KeycloakConnectionError) as e:
            raise HTTPException(
                status_code=500,
                detail="Autentizace selhala nebo Keycloak není dostupný",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e

    def get_realm_roles(self, token: Annotated[str, Depends(oauth2_bearer)]) -> list:
        try:
            user_info: dict = self.keycloak_openid.userinfo(token)

            user_id: str = user_info.get("sub")

            if not user_id:
                raise HTTPException(
                    status_code=401, detail="ID uživatele nenalezeno v tokenu"
                )

            roles: list = self.keycloak_admin.get_realm_roles_of_user(user_id=user_id)

            print(roles)

            return [role["name"] for role in roles]

        except (KeycloakAuthenticationError, KeycloakConnectionError) as e:
            print(f"Keycloak error: {e}")
            raise HTTPException(
                status_code=401,
                detail="Nepodařilo se ověřit uživatele nebo získat role",
            ) from e


ROLE_HIERARCHY: dict[str, int] = {
    "superadmin": 3,
    "admin": 2,
    "user": 1,
}


def require_role(min_role: str):
    min_level: int = ROLE_HIERARCHY.get(min_role, 0)

    def checker(roles: Annotated[list, Depends(auth.get_realm_roles)]):
        user_level = max(
            (ROLE_HIERARCHY.get(role, 0) for role in roles),
            default=0,
        )
        if user_level < min_level:
            raise HTTPException(status_code=403, detail="Nedostatečná oprávnění")

    return Depends(checker)


auth = Auth()
CurrentUser = Annotated[dict, Depends(auth.get_current_user)]
RealmRoles = Annotated[list, Depends(auth.get_realm_roles)]
