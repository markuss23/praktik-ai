from pydantic import Field

from api.src.common.schemas import ORMModel
from api.enums import ActivityKind, QuestionType


class ActivityBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    content: dict | None = None
    order: int = Field(
        default=1, ge=1, description="Pořadí aktivit v rámci modulu (>= 1)"
    )
    kind: ActivityKind = Field(default=ActivityKind.practice)


class ActivityCreate(ActivityBase):
    module_id: int = Field(description="FK na module.module_id")


class ActivityUpdate(ActivityBase):
    is_active: bool = True


class Activity(ActivityBase):
    activity_id: int
    module_id: int
    is_active: bool


class LearnBlockBase(ORMModel):
    position: int
    content: str


class LearnBlock(LearnBlockBase):
    learn_id: int
    module_id: int


class PracticeOptionBase(ORMModel):
    position: int
    text: str


class PracticeOption(PracticeOptionBase):
    option_id: int
    question_id: int


class QuestionKeywordBase(ORMModel):
    keyword: str


class QuestionKeyword(QuestionKeywordBase):
    keyword_id: int
    question_id: int


class PracticeQuestionBase(ORMModel):
    position: int
    question_type: QuestionType
    question: str

    correct_answer: str | None = None
    example_answer: str | None = None

    closed_options: list[PracticeOption] = []
    open_keywords: list[QuestionKeyword] = []


class PracticeQuestion(PracticeQuestionBase):
    question_id: int
    practice_id: int


class PracticeBase(ORMModel):
    position: int


class Practice(PracticeBase):
    practice_id: int
    module_id: int

    questions: list[PracticeQuestion] = []
