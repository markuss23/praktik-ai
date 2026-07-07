"""Nastavení formátu 'AI procvičování' — plně AI vedené, vázané na modul."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AiPracticeSettings(BaseModel):
    """
    AI generuje otázky z obsahu learn blocků modulu, personalizuje je
    (historie session, profil studenta, volitelné téma) a hned hodnotí.
    Lektor nastavuje jen mantinely — obsah vzniká za běhu.
    """

    model_config = ConfigDict(extra="forbid")

    question_types: Literal["open", "closed", "mixed"] = Field(
        default="mixed",
        description="Jaké typy otázek se generují (mixed = náhodně obojí)",
    )
    max_questions: int | None = Field(
        default=None,
        ge=1,
        description="Limit otázek na session; None = neomezeně (končí student)",
    )
    focus_allowed: bool = Field(
        default=True,
        description="Student smí zadat téma, které chce procvičit",
    )
