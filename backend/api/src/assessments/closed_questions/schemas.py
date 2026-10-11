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

    # Prázdné smí být (rozpracovaný test) — start session to odmítne
    questions: list[ClosedQuestionItem] = Field(
        default_factory=list, description="Sada otázek vytvořená lektorem"
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


class ClosedQuestionsResult(BaseModel):
    """Stav běhu uložený v session.result."""

    current: int = Field(default=0, ge=0, description="Index aktuální otázky")
    attempts_used: int = Field(
        default=0, ge=0, description="Pokusy spotřebované na aktuální otázku"
    )
    correct_count: int = Field(default=0, ge=0, description="Počet zvládnutých otázek")


class ClosedQuestionsView(BaseModel):
    """Co student vidí — aktuální otázka bez správné odpovědi."""

    question: str
    options: list[str]
