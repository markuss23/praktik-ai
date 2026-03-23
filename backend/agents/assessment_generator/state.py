from typing import NotRequired, TypedDict

from sqlalchemy.orm import Session


class AssessmentState(TypedDict):
    module_id: int
    user_id: int
    db: Session
    learn_content: NotRequired[str]
    generated_question: NotRequired[str]
    session_id: NotRequired[int | None]
    error: NotRequired[str | None]
