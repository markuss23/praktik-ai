from typing import NotRequired, TypedDict

from sqlalchemy.orm import Session


class EvaluatorState(TypedDict):
    db: Session
    user_question_id: int
    user_input: str
    # Načteno z DB
    learn_content: NotRequired[str]
    generated_question: NotRequired[str]
    # Výstup LLM
    is_correct: NotRequired[bool]
    ai_response: NotRequired[str]
    # Výsledek
    attempt_id: NotRequired[int | None]
    error: NotRequired[str | None]
