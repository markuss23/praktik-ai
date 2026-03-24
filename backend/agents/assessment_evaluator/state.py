from typing import NotRequired, TypedDict

from sqlalchemy.orm import Session


class EvaluationState(TypedDict):
    session_id: int
    user_id: int
    user_response: str
    db: Session
    # Načteno z DB
    learn_content: NotRequired[str]
    generated_question: NotRequired[str]
    passing_score: NotRequired[int]
    # Výstup LLM
    ai_score: NotRequired[int]
    ai_feedback: NotRequired[str]
    is_passed: NotRequired[bool]
    # Výsledek
    attempt_id: NotRequired[int | None]
    error: NotRequired[str | None]
