from typing import TypedDict
from pydantic import BaseModel
from sqlalchemy.orm import Session


class LearnBlockQueryAttr(BaseModel):
    course_id: int
    module_id: int


class ChunkData(BaseModel):
    content: str
    metadata: dict


class AgentState(TypedDict):
    learn_block_id: int
    db: Session
    message: str

    learn_block_query_attr: LearnBlockQueryAttr

    context_chunks: list[ChunkData]

    answer: str
