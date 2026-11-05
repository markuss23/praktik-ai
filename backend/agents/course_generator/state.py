from typing import NotRequired, TypedDict

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.src.assessments.pretest.schemas import PretestSettings


# ---------- Agentní schémata (LLM structured output) ----------
# Tato schémata jsou oddělena od API response schémat.


class ModuleGenerated(BaseModel):
    title: str
    perex: str
    content: str  # výklad modulu (HTML), ukládá se jako jediný learn block


class CourseGenerated(BaseModel):
    title: str
    modules: list[ModuleGenerated] = []


class ModuleEnrichment(BaseModel):
    """Zařazení hotového výkladu modulu do číselníků.

    Otázky (pretest) generuje zvlášť api/src/assessments/pretest/generator.py.
    """

    neuro_principle_code: str = Field(
        description='Kód přesně jednoho neurovědního principu, např. "NP-01".'
    )
    krauu_competence_codes: list[str] = Field(
        description='1–3 kódy kompetencí KRAUU, např. "2.4"; nikdy kódy oblastí "x.0".'
    )
    bloom_level_codes: list[str] = Field(
        description='1–3 číselné kódy úrovní Bloomovy taxonomie, např. "3".'
    )


# ---------- Vstupní data kurzu ----------


class CourseInput(BaseModel):
    """Vstupní data kurzu načtená z DB"""

    title: str
    description: str | None
    modules_count_ai_generated: int
    duration_minutes: int | None
    files: list[str]  # cesty k souborům


class AgentState(TypedDict):
    course_id: int
    db: Session
    # Vstupní data z DB
    course_input: NotRequired[CourseInput]
    source_content: NotRequired[str]  # obsah načtených souborů
    summarize_content: str
    # Výstup
    course: NotRequired[CourseGenerated]
    enrichments: NotRequired[list[ModuleEnrichment]]  # 1:1 k course.modules
    pretests: NotRequired[list[PretestSettings]]  # 1:1 k course.modules
