from pydantic import BaseModel, ConfigDict, Field, model_validator


class ClosedQuestionItem(BaseModel):
    """Jedna uzavřená otázka: text + možnosti + index správné odpovědi."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1, description="Text otázky")
    options: list[str] = Field(
        ..., min_length=2, max_length=6, description="Nabízené možnosti (a/b/c...)"
    )
    correct_index: int = Field(
        ..., ge=0, description="Index správné možnosti v poli options"
    )

    @model_validator(mode="after")
    def _correct_index_in_range(self):
        if self.correct_index >= len(self.options):
            raise ValueError(
                f"correct_index {self.correct_index} ukazuje mimo options "
                f"(otázka má {len(self.options)} možností)"
            )
        return self


class ClosedQuestionsSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questions: list[ClosedQuestionItem] = Field(
        ..., min_length=1, description="Sada otázek vytvořená lektorem"
    )

    max_attempts: int = Field(
        default=3, ge=1, description="Kolik pokusů má student na jednu otázku"
    )
