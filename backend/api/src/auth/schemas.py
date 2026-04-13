from pydantic import BaseModel, Field

from api.enums import UserRole
from api.src.common.schemas import ORMModel


class UserResponse(ORMModel):
    user_id: int
    sub: str
    email: str
    display_name: str | None
    role: UserRole
    is_active: bool
    ai_tone: str
    ai_expression_level: str


class ProfileUpdate(BaseModel):
    ai_tone: str = Field(..., max_length=100)
    ai_expression_level: str = Field(..., max_length=100)
