from api.enums import UserRole
from api.src.common.schemas import ORMModel


class CurrentUserResponse(ORMModel):
    user_id: int
    sub: str
    email: str
    display_name: str | None
    role: UserRole
    is_active: bool
