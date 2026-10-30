from typing import NotRequired, TypedDict
from sqlalchemy.orm import Session


class DialogState(TypedDict):
    db: Session
    course_id: int
    # None = course_final -> learn blocky celého kurzu
    module_id: int | None
    topic: str
    # [{role, content}] — poslední je odpověď studenta
    turns: list[dict]
    max_step: int
    # Smí AI rozhovor ukončit / musí ho ukončit
    can_end: bool
    must_end: bool
    # Načteno z DB
    learn_content: NotRequired[str]

    # Vygenerováno
    delta: NotRequired[int]
    # None = AI rozhovor ukončila (KONEC)
    question: NotRequired[str | None]
    error: NotRequired[str]
