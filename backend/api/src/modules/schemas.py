from datetime import datetime
from pydantic import Field
from api.src.common.schemas import ORMModel
from api.src.activities.schemas import LearnBlock, Practice


class ModuleBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    position: int = Field(
        default=1, ge=1, description="Pořadí modulu v rámci kurzu (>= 1)"
    )


class ModuleCreate(ModuleBase):
    course_id: int = Field(description="FK na course.course_id")


class ModuleUpdate(ModuleBase):
    is_active: bool = True


class Module(ModuleBase):
    module_id: int
    course_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    learn_blocks: list[LearnBlock] = []
    practices: list[Practice] = []
