"""State pro embedding generator agenta."""
from typing import NotRequired, TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session


class LearnBlockData(BaseModel):
    """Data jednoho learn blocku."""
    learn_id: int
    module_id: int
    position: int
    content: str


class ChunkData(BaseModel):
    """Data jednoho chunku s embeddingem."""
    learn_block_id: int
    chunk_index: int
    chunk_text: str
    embedding: list[float]


class AgentState(TypedDict):
    """State pro embedding generator agenta."""
    course_id: int
    db: Session
    
    # Data načtená z DB
    learn_blocks: NotRequired[list[LearnBlockData]]
    total_blocks: NotRequired[int]
    
    # Vygenerované embeddingy
    chunks: NotRequired[list[ChunkData]]
    total_chunks: NotRequired[int]
    
    # Výsledek
    blocks_processed: NotRequired[int]
    chunks_created: NotRequired[int]
    model_name: NotRequired[str]
