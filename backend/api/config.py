from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class DBSettings(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str
    
    def get_connection_string(self) -> str:
        return f"postgresql+psycopg://{self.user}:{self.password}@{self.host}:{self.port}"


class Settings(BaseSettings):
    db: DBSettings

    model_config = SettingsConfigDict(
        env_file=".env",  # Možná to bude dělat bordel, jakmile to bude v dockeru
        env_nested_delimiter="__",
        case_sensitive=False,
         extra="ignore",
        
    )


settings = Settings()
