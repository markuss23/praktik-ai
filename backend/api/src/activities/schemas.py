from pydantic import Field

from api.src.common.schemas import ORMModel


class LearnBlockBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    content: str


class LearnBlockUpdate(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    content: str


class LearnBlockCreate(ORMModel):
    module_id: int
    title: str = Field(min_length=1, max_length=200)
    content: str = ""


class LearnBlock(LearnBlockBase):
    learn_id: int
    module_id: int
