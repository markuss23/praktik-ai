from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class PostgresSettings(BaseModel):
    host: str
    port: int
    user: str
    password: str
    db: str

    def get_connection_string(self) -> str:
        return f"postgresql+psycopg://{self.user}:{self.password}@{self.host}:{self.port}/{self.db}"


class KeycloakSettings(BaseModel):
    server_url: str
    realm_name: str
    client_id: str
    client_secret: str


class SeaweedFSSettings(BaseModel):
    master_url: str = "http://seaweedfs-master:9333"
    filer_url: str = "http://seaweedfs-filer:8888"


class Settings(BaseSettings):
    postgres: PostgresSettings
    keycloak: KeycloakSettings
    seaweedfs: SeaweedFSSettings = SeaweedFSSettings()

    model_config = SettingsConfigDict(
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
