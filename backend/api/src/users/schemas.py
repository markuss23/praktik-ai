from api.enums import UserRole
from api.src.common.schemas import ORMModel


class UserWithRole(ORMModel):
    user_id: int
    email: str
    display_name: str | None
    role: UserRole
    is_active: bool


class UserRoleUpdate(ORMModel):
    role: UserRole


class UserRoleResponse(ORMModel):
    user_id: int
    email: str
    display_name: str | None
    role: UserRole
