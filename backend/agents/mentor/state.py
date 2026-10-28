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
    user_id: int
    db: Session
    message: str
    use_history: bool
    scope: str  # "module" | "course"

    learn_block_query_attr: LearnBlockQueryAttr
    course_title: str
    module_title: str
    learn_block_title: str
    learn_block_content: str
    ai_style: str
    ai_style_codes: list[str]
    history: list[tuple[str, str]]
    needs_retrieval: bool
    search_query: str

    context_chunks: list[ChunkData]

    answer: str
