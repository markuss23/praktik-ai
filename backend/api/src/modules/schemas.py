from pydantic import Field
from api.src.common.schemas import ORMModel


class ModuleBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    order: int = Field(
        default=1, ge=1, description="Pořadí modulu v rámci kurzu (>= 1)"
    )


class ModuleCreate(ModuleBase):
    course_id: int = Field(description="FK na course.course_id")


class ModuleUpdate(ModuleBase):
    is_active: bool = True
    is_published: bool = Field(default=False, description="Je modul publikován?")


class Module(ModuleBase):
    module_id: int
    course_id: int
    is_active: bool
    is_published: bool
