from typing import NotRequired, TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.enums import QuestionType


# ---------- Agentní schémata (LLM structured output) ----------
# Tato schémata jsou oddělena od API response schémat.


class LearnBlockGenerated(BaseModel):
    content: str


class PracticeOptionGenerated(BaseModel):
    text: str


class QuestionKeywordGenerated(BaseModel):
    keyword: str


class PracticeQuestionGenerated(BaseModel):
    question_type: QuestionType
    question: str
    correct_answer: str | None = None
    example_answer: str | None = None
    closed_options: list[PracticeOptionGenerated] = []
    open_keywords: list[QuestionKeywordGenerated] = []


class ModuleGenerated(BaseModel):
    title: str
    learn_blocks: list[LearnBlockGenerated] = []
    practice_questions: list[PracticeQuestionGenerated] = []


class CourseGenerated(BaseModel):
    title: str
    modules: list[ModuleGenerated] = []


# ---------- Vstupní data kurzu ----------


class CourseInput(BaseModel):
    """Vstupní data kurzu načtená z DB"""

    title: str
    description: str | None
    modules_count_ai_generated: int
    files: list[str]  # cesty k souborům


class AgentState(TypedDict):
    course_id: int
    db: Session
    # Vstupní data z DB
    course_input: NotRequired[CourseInput]
    source_content: NotRequired[str]  # obsah načtených souborů
    summarize_content: str
    # Výstup
    course: NotRequired[CourseGenerated]
