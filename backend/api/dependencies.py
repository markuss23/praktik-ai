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
        except Exception as e:
            print(f"Warning: Failed to initialize Keycloak: {e}")
            self.keycloak_openid = None

    def get_token(self, username: str, password: str) -> dict:
        return 
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
        user_dict = {"sub": "d705a727-677f-4ef7-a4df-70a3c8d51e8f"}
        
        return user_dict
        
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


auth = Auth()
CurrentUser = Annotated[dict, Depends(auth.get_current_user)]
