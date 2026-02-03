from keycloak import KeycloakOpenID
from .config import settings


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

    def test_connection(self):
        if not self.keycloak_openid:
            return False
        try:
            # Attempt to get the OpenID configuration as a test
            config = self.keycloak_openid.well_known()
            return "issuer" in config
        except Exception:
            return False

    def authenticate_user(self, username: str, password: str) -> dict:
        if not self.keycloak_openid:
            raise Exception("Keycloak is not initialized")
        return self.keycloak_openid.token(username, password)


auth = Auth()
