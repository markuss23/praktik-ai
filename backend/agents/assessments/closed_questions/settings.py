"""Nastavení formátu 'Uzavřené otázky' — otázky autoruje lektor/garant."""

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
    """
    Student prochází otázky po jedné, po každé odpovědi dostane okamžitou
    zpětnou vazbu (správně/špatně), na konci skóre proti prahu úspěšnosti.
    """

    model_config = ConfigDict(extra="forbid")

    questions: list[ClosedQuestionItem] = Field(
        ..., min_length=1, description="Sada otázek vytvořená lektorem"
    )
    num_questions: int | None = Field(
        default=None,
        ge=1,
        description="Kolik otázek se náhodně vybere; None = všechny v náhodném pořadí",
    )
    shuffle_options: bool = Field(
        default=True, description="Míchat pořadí možností pro každou session"
    )
    pass_threshold: float = Field(
        default=0.75, ge=0, le=1, description="Podíl správných odpovědí pro úspěch"
    )

    @model_validator(mode="after")
    def _num_questions_le_total(self):
        if self.num_questions is not None and self.num_questions > len(self.questions):
            raise ValueError(
                f"num_questions ({self.num_questions}) je víc než "
                f"počet otázek v sadě ({len(self.questions)})"
            )
        return self
