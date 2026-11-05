from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


# Pole viz README.md (Settings: min_turns, max_turns, elo...; State: topic, turns...)
class SocraticDialogAISettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min_turns: int = Field(
        ge=1,
        le=10,
        description="Minimum number of turns in the Socratic dialog.",
        default=2,
    )
    max_turns: int = Field(
        ge=2,
        le=10,
        description="Maximum number of turns in the Socratic dialog.",
        default=4,
    )

    start_elo: int = Field(
        ge=500,
        le=3000,
        description="Starting Elo rating for the Socratic dialog AI.",
        default=1000,
    )

    min_elo: int = Field(
        ge=500,
        le=3000,
        description="Minimum Elo rating for the Socratic dialog AI.",
        default=800,
    )

    max_elo: int = Field(
        ge=1000,
        le=3000,
        description="Maximum Elo rating for the Socratic dialog AI.",
        default=1200,
    )

    max_step: int = Field(
        ge=1,
        le=100,
        description="Maximum number of steps in the Socratic dialog.",
        default=50,
    )

    pass_elo: int = Field(
        ge=500,
        le=3000,
        description="Elo rating required to pass the Socratic dialog.",
        default=1200,
    )

    @model_validator(mode="after")
    def _consistent(self):
        if self.min_turns > self.max_turns:
            raise ValueError("min_turns musí být <= max_turns")
        # min < max i kvůli dělení ve výpočtu score
        if not self.min_elo <= self.start_elo <= self.max_elo or self.min_elo == self.max_elo:
            raise ValueError("musí platit min_elo <= start_elo <= max_elo a min_elo < max_elo")
        if not self.min_elo <= self.pass_elo <= self.max_elo:
            raise ValueError("pass_elo musí být mezi min_elo a max_elo")
        return self


class SocraticDialogAIView(BaseModel):
    question: str = Field(..., min_length=1)


class SocraticDialogAITurn(BaseModel):
    role: Literal["assistant", "student"]
    content: str
    # Změna elo za odpověď studenta (u otázek AI None)
    delta: int | None = None


class SocraticDialogAIState(BaseModel):
    # Téma vymyšlené AI v initial_state, platí pro celý rozhovor
    topic: str = Field(..., min_length=1)
    # Paměť konverzace
    turns: list[SocraticDialogAITurn] = Field(..., min_length=1)
    elo: int
    summary: str = ""
    # Předchozí odpověď — čte ji typing guard (typed_too_fast)
    last_answer: str = ""
