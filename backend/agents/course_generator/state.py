from typing import NotRequired, TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.src.courses.schemas import Course


class CourseInput(BaseModel):
    """Vstupní data kurzu načtená z DB"""

    title: str
    description: str | None
    modules_count: int
    files: list[str]  # cesty k souborům


class AgentState(TypedDict):
    course_id: int
    db: Session
    # Vstupní data z DB
    course_input: NotRequired[CourseInput]
    source_content: NotRequired[str]  # obsah načtených souborů
    summarize_content: str
    # Výstup
    course: NotRequired[Course]
