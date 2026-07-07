"""Nastavení formátu 'Otevřené otázky' — otázky autoruje lektor/garant."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class OpenQuestionItem(BaseModel):
    """Jedna otevřená otázka: text + vzorová odpověď + klíčové body.

    Vzorová odpověď a klíčová slova slouží AI evaluátorovi jako měřítko —
    studentovi se nikdy neposílají ani neprozrazují ve feedbacku.
    """

    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1, description="Text otázky")
    example_answer: str = Field(
        ..., min_length=1, description="Vzorová správná odpověď (měřítko pro AI)"
    )
    keywords: list[str] = Field(
        default_factory=list,
        description="Klíčové body, které má odpověď pokrýt (volitelné)",
    )


class OpenQuestionsSettings(BaseModel):
    """
    Student odpovídá volným textem po jedné otázce, každou odpověď ohodnotí
    AI (skóre 0-100 + feedback bez prozrazení odpovědi). Na konci se průměr
    skóre porovná s prahem úspěšnosti.
    """

    model_config = ConfigDict(extra="forbid")

    questions: list[OpenQuestionItem] = Field(
        ..., min_length=1, description="Sada otázek vytvořená lektorem"
    )
    num_questions: int | None = Field(
        default=None,
        ge=1,
        description="Kolik otázek se náhodně vybere; None = všechny v náhodném pořadí",
    )
    pass_threshold: float = Field(
        default=0.75, ge=0, le=1, description="Podíl průměrného skóre pro úspěch"
    )
    evaluation_mode: Literal["ai", "human", "ai_human"] = Field(
        default="ai",
        description=(
            "Kdo hodnotí: 'ai' = AI okamžitě, 'human' = lektor "
            "(bez AI), 'ai_human' = AI připraví draft, finální hodnocení "
            "vrací lektor"
        ),
    )

    @model_validator(mode="after")
    def _num_questions_le_total(self):
        if self.num_questions is not None and self.num_questions > len(self.questions):
            raise ValueError(
                f"num_questions ({self.num_questions}) je víc než "
                f"počet otázek v sadě ({len(self.questions)})"
            )
        return self
