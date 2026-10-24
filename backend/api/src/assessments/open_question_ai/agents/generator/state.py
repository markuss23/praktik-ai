from typing import NotRequired, TypedDict
from sqlalchemy.orm import Session


class GeneratorState(TypedDict):
    db: Session
    module_id: int
    user_id: int
    # Načteno z DB
    learn_content: NotRequired[str]

    # Vygenerováno
    question: NotRequired[str]
