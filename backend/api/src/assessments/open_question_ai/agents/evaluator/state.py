from typing import NotRequired, TypedDict

from sqlalchemy.orm import Session


class EvaluatorState(TypedDict):
    db: Session
    answer: str
    module_id: int
    question: str
    # Načteno z DB
    learn_content: NotRequired[str]
    # Výstup LLM
    ai_response: NotRequired[str]
    score: NotRequired[float]
    # Výsledek
    error: NotRequired[str | None]
