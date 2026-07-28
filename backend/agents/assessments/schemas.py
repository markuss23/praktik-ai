"""
Sdílený kontrakt interakčních formátů (assessments).

Dvě discriminated unions tvoří API kontrakt mezi backendem a frontendem:

- ``TurnInput``  — co může student poslat (diskriminátor ``kind``)
- ``AssessmentView`` — co má frontend vykreslit (diskriminátor ``kind``)

Nový formát = přidat sem svůj view/input model a rozšířit unions.
To je jediné sdílené místo, kterého se nový formát dotkne.

V této fázi je tu jen to, co potřebuje `closed_questions` — další formáty
(otevřené otázky, AI procvičování...) sem přibudou spolu se svou implementací.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

# ---------- Vstupy tahů (co posílá student) ----------


class OptionTurnInput(BaseModel):
    """Uzavřené otázky: student vybírá jednu z nabízených možností."""

    kind: Literal["option"] = "option"
    option_index: int = Field(
        ..., ge=0, description="Index vybrané možnosti v aktuální otázce"
    )


TurnInput = Annotated[
    OptionTurnInput,
    Field(discriminator="kind"),
]


# ---------- Views (co vykresluje frontend) ----------


class ClosedQuestionView(BaseModel):
    """Obrazovka formátu 'Uzavřené otázky' — jedna otázka s možnostmi.

    Správná odpověď se klientovi nikdy neposílá — vyhodnocuje ji backend.
    """

    kind: Literal["closed_question"] = "closed_question"
    question: str = Field(..., description="Text otázky")
    options: list[str] = Field(..., description="Možnosti v pořadí pro zobrazení")
    question_number: int = Field(..., description="Pořadí otázky (od 1)")
    total_questions: int = Field(..., description="Celkový počet otázek")
    attempts_remaining: int = Field(
        ..., description="Kolik pokusů na tuto otázku ještě zbývá (včetně tohoto)"
    )
    last_answer_correct: bool | None = Field(
        default=None,
        description="Výsledek posledního odeslaného pokusu (None u úplně první otázky)",
    )


class ResultView(BaseModel):
    """Závěrečná obrazovka — společná pro všechny formáty."""

    kind: Literal["result"] = "result"
    score: float | None = Field(default=None, description="Skóre 0-100 (pokud formát hodnotí)")
    is_passed: bool | None = Field(default=None, description="Verdikt (pokud formát hodnotí)")
    message: str | None = Field(default=None, description="Shrnutí / závěrečná zpráva")


AssessmentView = Annotated[
    ClosedQuestionView | ResultView,
    Field(discriminator="kind"),
]
