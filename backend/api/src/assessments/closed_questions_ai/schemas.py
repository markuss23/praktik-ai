from pydantic import BaseModel, ConfigDict, Field

from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionItem,
    ClosedQuestionsState,
)


class ClosedQuestionsAISettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_count: int = Field(
        default=5, ge=1, le=20, description="Kolik otázek AI vygeneruje"
    )
    max_attempts: int = Field(
        default=3, ge=1, description="Kolik pokusů má student na jednu otázku"
    )
    pass_threshold: float = Field(
        default=0.75,
        ge=0,
        le=1,
        description="Podíl zvládnutých otázek potřebný k 'passed' (jinak 'failed')",
    )


class ClosedQuestionsAIState(ClosedQuestionsState):
    """Stav běhu — navíc nese otázky vygenerované při startu session.

    Otázky (včetně correct_index) žijí jen v session.state, ven jde přes `view`
    bez správné odpovědi.
    """

    questions: list[ClosedQuestionItem] = Field(..., min_length=1)
