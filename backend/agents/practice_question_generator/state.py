from typing import NotRequired, TypedDict

from sqlalchemy.orm import Session

from api.enums import QuestionType


class GeneratorState(TypedDict):
    db: Session
    module_id: int
    user_id: int
    question_type: QuestionType
    # Načteno z DB
    learn_content: NotRequired[str]
    # Vygenerováno LLM
    generated_question: NotRequired[str]
    options: NotRequired[list[dict] | None]  # [{"text": "...", "is_correct": bool}]
    # Výsledek
    user_question_id: NotRequired[int | None]
    error: NotRequired[str | None]
