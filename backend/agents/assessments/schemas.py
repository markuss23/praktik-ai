"""
Sdílený kontrakt interakčních formátů (assessments).

Dvě discriminated unions tvoří API kontrakt mezi backendem a frontendem:

- ``TurnInput``  — co může student poslat (diskriminátor ``kind``)
- ``AssessmentView`` — co má frontend vykreslit (diskriminátor ``kind``)

Nový formát = přidat sem svůj view/input model a rozšířit unions.
To je jediné sdílené místo, kterého se nový formát dotkne.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

# ---------- Vstupy tahů (co posílá student) ----------


class QuestionsTurnInput(BaseModel):
    """Formulace otázek: student odesílá sadu otázek k tématu."""

    kind: Literal["questions"] = "questions"
    questions: list[str] = Field(
        ..., min_length=1, description="Otázky formulované studentem"
    )


class FinishTurnInput(BaseModel):
    """Student ukončuje session (u formátů bez verdiktu)."""

    kind: Literal["finish"] = "finish"


class OptionTurnInput(BaseModel):
    """Uzavřené otázky: student vybírá jednu z nabízených možností."""

    kind: Literal["option"] = "option"
    option_index: int = Field(
        ..., ge=0, description="Index vybrané možnosti v aktuální otázce"
    )


class AnswerTurnInput(BaseModel):
    """Otevřené otázky: student odpovídá volným textem na aktuální otázku."""

    kind: Literal["answer"] = "answer"
    text: str = Field(..., min_length=1, description="Odpověď studenta")


class NextQuestionTurnInput(BaseModel):
    """AI procvičování: student přeskakuje otázku / žádá další, volitelně s tématem."""

    kind: Literal["next_question"] = "next_question"
    focus: str | None = Field(
        default=None, description="Volitelné téma, které chce student procvičit"
    )


TurnInput = Annotated[
    QuestionsTurnInput
    | FinishTurnInput
    | OptionTurnInput
    | AnswerTurnInput
    | NextQuestionTurnInput,
    Field(discriminator="kind"),
]


# ---------- Review (hodnocení lektorem) ----------


class ReviewItemInput(BaseModel):
    """Hodnocení jedné položky (např. jedné otázky), v pořadí zadání."""

    score: float = Field(..., ge=0, le=100, description="Skóre položky 0-100")
    feedback: str | None = Field(default=None, description="Zpětná vazba k položce")


class ReviewInput(BaseModel):
    """Hodnocení session lektorem — interpretuje ho service formátu.

    Buď per-položkové ``items`` (celkové skóre se dopočítá průměrem),
    nebo rovnou celkové ``score``. ``is_passed`` umožňuje lektorovi
    explicitně přepsat verdikt vypočtený z prahu.
    """

    items: list[ReviewItemInput] | None = Field(
        default=None, description="Hodnocení po položkách, v pořadí zadání"
    )
    score: float | None = Field(
        default=None, ge=0, le=100, description="Celkové skóre (pokud nejsou items)"
    )
    feedback: str | None = Field(
        default=None, description="Celková slovní zpětná vazba pro studenta"
    )
    is_passed: bool | None = Field(
        default=None, description="Explicitní verdikt (jinak se počítá z prahu)"
    )


# ---------- Views (co vykresluje frontend) ----------


class QuestionFeedbackItem(BaseModel):
    """Zpětná vazba k jedné studentem formulované otázce."""

    question: str = Field(..., description="Otázka studenta")
    feedback: str = Field(..., description="Zpětná vazba AI (bez skóre)")


class QuestionFormulationView(BaseModel):
    """Obrazovka formátu 'Formulace otázek'."""

    kind: Literal["question_formulation"] = "question_formulation"
    topic: str = Field(..., description="Vybrané téma")
    questions_per_round: int = Field(..., description="Kolik otázek se odesílá najednou")
    rounds_submitted: int = Field(..., description="Počet dosud odeslaných kol")
    last_feedback: list[QuestionFeedbackItem] | None = Field(
        default=None, description="Feedback k poslednímu odeslanému kolu"
    )


class ClosedQuestionView(BaseModel):
    """Obrazovka formátu 'Uzavřené otázky' — jedna otázka s možnostmi.

    Správná odpověď se klientovi nikdy neposílá — vyhodnocuje ji backend.
    """

    kind: Literal["closed_question"] = "closed_question"
    question: str = Field(..., description="Text otázky")
    options: list[str] = Field(..., description="Možnosti v pořadí pro zobrazení")
    question_number: int = Field(..., description="Pořadí otázky (od 1)")
    total_questions: int = Field(..., description="Celkový počet otázek")
    last_answer_correct: bool | None = Field(
        default=None, description="Výsledek předchozí odpovědi (None u první otázky)"
    )


class OpenQuestionView(BaseModel):
    """Obrazovka formátu 'Otevřené otázky' — jedna otázka, volná odpověď.

    Vzorová odpověď ani klíčová slova se klientovi nikdy neposílají.
    """

    kind: Literal["open_question"] = "open_question"
    question: str = Field(..., description="Text otázky")
    question_number: int = Field(..., description="Pořadí otázky (od 1)")
    total_questions: int = Field(..., description="Celkový počet otázek")
    last_score: float | None = Field(
        default=None, description="Skóre předchozí odpovědi 0-100 (None u první otázky)"
    )
    last_feedback: str | None = Field(
        default=None, description="AI feedback k předchozí odpovědi"
    )


class PracticeQuestionView(BaseModel):
    """Obrazovka formátu 'AI procvičování' — vygenerovaná otázka + průběžné statistiky.

    U closed otázek se správná možnost klientovi neposílá — vyhodnocuje backend.
    """

    kind: Literal["practice_question"] = "practice_question"
    question: str = Field(..., description="Vygenerovaná otázka")
    question_type: Literal["open", "closed"] = Field(..., description="Typ otázky")
    options: list[str] | None = Field(
        default=None, description="Možnosti (jen u closed otázek)"
    )
    questions_answered: int = Field(..., description="Kolik otázek už student zodpověděl")
    correct_count: int = Field(..., description="Z toho správně")
    max_questions: int | None = Field(
        default=None, description="Limit otázek v session (None = neomezeně)"
    )
    last_correct: bool | None = Field(
        default=None, description="Výsledek předchozí odpovědi"
    )
    last_feedback: str | None = Field(
        default=None, description="Feedback k předchozí odpovědi"
    )


class ResultView(BaseModel):
    """Závěrečná obrazovka — společná pro všechny formáty."""

    kind: Literal["result"] = "result"
    score: float | None = Field(default=None, description="Skóre 0-100 (pokud formát hodnotí)")
    is_passed: bool | None = Field(default=None, description="Verdikt (pokud formát hodnotí)")
    message: str | None = Field(default=None, description="Shrnutí / závěrečná zpráva")


AssessmentView = Annotated[
    QuestionFormulationView
    | ClosedQuestionView
    | OpenQuestionView
    | PracticeQuestionView
    | ResultView,
    Field(discriminator="kind"),
]
