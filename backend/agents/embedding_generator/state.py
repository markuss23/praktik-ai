"""State pro embedding generator agenta."""

from typing import TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session


class LearnBlockData(BaseModel):
    """Data pro learn block."""

    learn_id: int
    module_id: int
    course_id: int
    position: int
    content: str


class AgentState(TypedDict):
    """State pro embedding generator agenta."""

    course_id: int
    db: Session
    
    learn_blocks: list[LearnBlockData]
