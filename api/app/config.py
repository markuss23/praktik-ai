from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class DBSettings(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str


class Settings(BaseSettings):
    db: DBSettings
    
    model_config = SettingsConfigDict(
        env_nested_delimiter='__',
        case_sensitive=False,
    )
    

settings = Settings()