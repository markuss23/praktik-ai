from pydantic import Field

from api.src.common.schemas import ORMModel
from api.models import ActivityKind


class ActivityBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    content: dict | None = None
    order: int = Field(
        default=1, ge=1, description="Pořadí aktivit v rámci modulu (>= 1)"
    )
    kind: ActivityKind = Field(default=ActivityKind.learn)


class ActivityCreate(ActivityBase):
    module_id: int = Field(description="FK na module.module_id")


class ActivityUpdate(ActivityBase):
    is_active: bool = True


class Activity(ActivityBase):
    activity_id: int
    module_id: int
    is_active: bool
