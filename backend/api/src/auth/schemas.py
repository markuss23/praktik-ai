from api.enums import UserRole
from api.src.common.schemas import ORMModel


class UserResponse(ORMModel):
    user_id: int
    sub: str
    email: str
    display_name: str | None
    role: UserRole
    is_active: bool
