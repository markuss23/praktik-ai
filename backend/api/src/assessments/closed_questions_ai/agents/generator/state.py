from typing import NotRequired, TypedDict

from sqlalchemy.orm import Session

from api.src.assessments.closed_questions.schemas import ClosedQuestionItem


class GeneratorState(TypedDict):
    db: Session
    course_id: int
    # None = course_final -> obsah všech modulů kurzu
    module_id: int | None
    count: int
    # Načteno z DB
    learn_content: NotRequired[str]
    # Vygenerováno
    questions: NotRequired[list[ClosedQuestionItem]]
    error: NotRequired[str | None]
