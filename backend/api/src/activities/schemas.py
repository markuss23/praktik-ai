from pydantic import Field

from api.src.common.schemas import ORMModel
from api.enums import QuestionType


class LearnBlockBase(ORMModel):
    position: int
    content: str


class LearnBlockUpdate(ORMModel):
    position: int
    content: str


class LearnBlock(LearnBlockBase):
    learn_id: int
    module_id: int


class PracticeOptionBase(ORMModel):
    position: int
    text: str


class PracticeOptionUpdate(ORMModel):
    position: int
    text: str


class PracticeOption(PracticeOptionBase):
    option_id: int
    question_id: int


class QuestionKeywordBase(ORMModel):
    keyword: str


class QuestionKeywordUpdate(ORMModel):
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


class PracticeQuestionUpdate(ORMModel):
    position: int
    question_type: QuestionType
    question: str

    correct_answer: str | None = None
    example_answer: str | None = None


class PracticeQuestion(PracticeQuestionBase):
    question_id: int
    module_id: int

