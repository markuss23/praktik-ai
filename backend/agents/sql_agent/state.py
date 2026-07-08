from typing import TypedDict

from sqlalchemy.orm import Session


class AgentState(TypedDict):
    db: Session
    user_input: str
    tables: list[str]
    schema: str
    query: str
    query_result: str
    answer: str
