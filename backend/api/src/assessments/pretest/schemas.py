from pydantic import BaseModel, ConfigDict, Field, model_validator

from api.src.assessments.closed_questions.schemas import ClosedQuestionItem

# Pevná struktura: 2 uzavřené, pak 1 otevřená (index CLOSED_COUNT)
CLOSED_COUNT = 2


class PretestOpenQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(..., min_length=1)
    example_answer: str = Field(..., min_length=1, description="Vzorová odpověď")
    keywords: list[str] = Field(
        ..., min_length=1, description="Klíčové body dobré odpovědi"
    )

    @model_validator(mode="after")
    def _unique_keywords(self):
        if len({k.strip() for k in self.keywords}) != len(self.keywords):
            raise ValueError("klíčové body se opakují")
        return self


class PretestSettings(BaseModel):
    """Otázky pretestu — generuje je generátor kurzu, lektor mění jen texty.

    Pravidla (pokusy, práh) jsou pevná v service.py, tady nejsou.
    """

    model_config = ConfigDict(extra="forbid")

    closed: list[ClosedQuestionItem] = Field(
        ..., min_length=CLOSED_COUNT, max_length=CLOSED_COUNT
    )
    open: PretestOpenQuestion

    @model_validator(mode="after")
    def _unique_options(self):
        for q in self.closed:
            if len({o.strip() for o in q.options}) != len(q.options):
                raise ValueError(f"možnosti otázky „{q.question}“ se opakují")
        return self


class PretestState(BaseModel):
    """Stav běhu uložený v session.state. Otázky se čtou z settings."""

    current: int = Field(default=0, ge=0, description="Index aktuální otázky")
    attempts_used: int = Field(
        default=0, ge=0, description="Pokusy spotřebované na aktuální otázku"
    )
    correct_count: int = Field(default=0, ge=0, description="Počet zvládnutých otázek")
    # Předchozí odpověď — při dalším pokusu ji student jen upravuje (typed_too_fast)
    last_answer: str = ""


class PretestView(BaseModel):
    """Co student vidí — u otevřené otázky bez možností."""

    question: str
    options: list[str] | None = None
