from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

Speaker = Literal["host", "expert"]


class PodcastContext(BaseModel):
    """Kontext modulu načtený z DB, ze kterého LLM píše scénář."""

    course_title: str
    module_title: str
    learn_block_content: str | None
    target_name: str | None = None


class PodcastLine(BaseModel):
    """Jedna replika podcastu."""

    speaker: Speaker = Field(
        description="host = moderátor, ptá se a shrnuje; expert = vysvětluje látku."
    )
    text: str = Field(
        description="Mluvený text repliky česky, 1–4 věty, bez markdownu a HTML."
    )


class PodcastScript(BaseModel):
    """Scénář podcastu (structured output z LLM)."""

    lines: list[PodcastLine] = Field(
        description="Repliky v pořadí. Začíná a končí host. 20–40 replik."
    )


class PodcastGeneratorState(TypedDict):
    db: Session
    module_id: int
    # Klíč trackeru průběhu (progress.podcast_key); None mimo background task
    progress_key: NotRequired[str | None]
    context: NotRequired[PodcastContext]
    script: NotRequired[PodcastScript]
    # Výsledné MP3 (repliky slepené za sebou)
    audio: NotRequired[bytes]
