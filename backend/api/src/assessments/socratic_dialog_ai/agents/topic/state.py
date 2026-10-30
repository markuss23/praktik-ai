from typing import NotRequired, TypedDict
from sqlalchemy.orm import Session


class TopicState(TypedDict):
    db: Session
    course_id: int
    # None = course_final -> learn blocky celého kurzu
    module_id: int | None
    # Načteno z DB
    learn_content: NotRequired[str]

    # Vygenerováno
    topic: NotRequired[str]
    question: NotRequired[str]
    error: NotRequired[str]
