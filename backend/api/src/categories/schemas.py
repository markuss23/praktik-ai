from pydantic import Field
from api.src.common.schemas import ORMModel


class CategoryBase(ORMModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class Category(CategoryBase):
    category_id: int
    is_active: bool
