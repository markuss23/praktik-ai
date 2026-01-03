from typing import NotRequired, TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session


class Question(BaseModel):
    """definuje otázku s možnostmi odpovědí"""

    question: str
    options: list[str]  # možnosti A, B, C
    correct_answer: str  # správná odpověď (A, B nebo C)


class Activity(BaseModel):
    """definuje aktivitu v modulu"""

    learn: str  # látka k naučení
    practice: list[Question]  # 2 uzavřené otázky ABC


class Module(BaseModel):
    """definuje modul pro kurz"""

    name: str
    description: str  # o čem modul je
    activity: Activity


class Course(BaseModel):
    """definuje kurz"""

    title: str
    modules: list[Module]


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
