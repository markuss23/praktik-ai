from pydantic import BaseModel, ConfigDict, Field


class OpenQuestionAISettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # question: str = Field(
    #     "Otázka",
    #     min_length=1,
    #     max_length=255,
    # )
    # examples: list[str] = Field(["prikald"], min_length=1, max_length=6)
    max_attempts: int = 3
    pass_threshold: float = Field(
        default=0.75,
        ge=0,
        le=1,
    )


class OpenQuestionAIView(BaseModel):
    question: str = Field(..., min_length=1, max_length=255)


class OpenQuestionAIState(BaseModel):
    question: str = Field(..., min_length=1, max_length=255)
    attempts_used: int = Field(0, ge=0)
    # Předchozí odpověď — při dalším pokusu ji student jen upravuje (typed_too_fast)
    last_answer: str = ""
