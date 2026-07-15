"""State pro wiki mentor agenta (RAG chat nad GitHub wiki obsahem)."""

from typing import TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session


class ChunkData(BaseModel):
    """Jeden chunk nalezený ve vector store při dotazování."""

    content: str
    metadata: dict


class WikiMentorState(TypedDict):
    """State pro wiki mentor agenta."""

    db: Session
    message: str
    context_chunks: list[ChunkData]
    answer: str
