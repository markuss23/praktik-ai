"""Nastavení formátu 'Formulace otázek' — vyplňuje lektor/garant na kurzu."""

from pydantic import BaseModel, ConfigDict, Field


class QuestionFormulationSettings(BaseModel):
    """
    Garant vytvoří témata, systém při startu session náhodně vybere jedno.
    Student k němu formuluje otázky, AI dá zpětnou vazbu ke každé (bez skóre).
    """

    model_config = ConfigDict(extra="forbid")

    topics: list[str] = Field(
        ...,
        min_length=1,
        description="Témata vytvořená garantem — systém náhodně vybere jedno",
    )
    questions_per_round: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Kolik otázek student formuluje v jednom kole",
    )
