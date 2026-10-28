"""Generování otázek pretestu z hotového výkladu modulu (volá generátor kurzu).

Vlastní prompt (prompt.md) — lehký concept check, ne zkouška. Model je
v system_setting „pretest“.
"""

import logging
import random
from pathlib import Path

from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agents.base.llm import create_chat_llm, get_llm_config
from api.src.assessments.pretest.schemas import PretestSettings

logger = logging.getLogger(__name__)

PROMPT_KEY = "pretest"
PROMPT = (Path(__file__).parent / "prompt.md").read_text(encoding="utf-8")


# Výstup LLM — bez min/max omezení (structured output je nepodporuje),
# pevné počty hlídá validate_generated
class ClosedQuestionGenerated(BaseModel):
    question: str
    options: list[str] = Field(description="Přesně 3 textově odlišné možnosti.")
    correct_answer: str = Field(description="Doslovná kopie textu správné možnosti.")


class OpenQuestionGenerated(BaseModel):
    question: str
    example_answer: str
    keywords: list[str] = Field(description="Přesně 3 klíčové body dobré odpovědi.")


class PretestGenerated(BaseModel):
    """Pevná pole vynucují poměr 2 uzavřené + 1 otevřená."""

    closed_question_1: ClosedQuestionGenerated
    closed_question_2: ClosedQuestionGenerated
    open_question: OpenQuestionGenerated


def create_pretest_llm(db: Session):
    """LLM se structured outputem. Volat v hlavním vlákně (čte DB), generovat lze paralelně."""
    cfg = get_llm_config(db, PROMPT_KEY)
    return create_chat_llm(cfg.model).with_structured_output(
        PretestGenerated, method="json_schema"
    )


def validate_generated(generated: PretestGenerated) -> list[str]:
    """Vrátí chyby otázek, které schéma samo nevynutí.

    Platforma porovnává odpověď s textem možnosti doslova, proto
    correct_answer lišící se jen bílými znaky rovnou sjednotí s možností.
    """
    errors: list[str] = []

    for name in ("closed_question_1", "closed_question_2"):
        q = getattr(generated, name)
        if len(q.options) != 3:
            errors.append(f"{name}: má {len(q.options)} možností, musí mít přesně 3")
        if len({o.strip() for o in q.options}) != len(q.options):
            errors.append(f"{name}: možnosti se textově opakují")
        matches = [o for o in q.options if o.strip() == q.correct_answer.strip()]
        if matches:
            q.correct_answer = matches[0]
        else:
            errors.append(
                f"{name}: correct_answer „{q.correct_answer}“ není doslova shodný "
                "s textem žádné z možností"
            )

    open_q = generated.open_question
    if len(open_q.keywords) != 3:
        errors.append(
            f"open_question: má {len(open_q.keywords)} klíčových bodů, musí mít přesně 3"
        )
    if not open_q.example_answer.strip():
        errors.append("open_question: example_answer je prázdný")

    return errors


def generate_pretest(llm: BaseChatModel, module_block: str, title: str) -> PretestSettings:
    """Jedno volání LLM; při chybách otázek jeden opravný pokus s jejich výpisem."""
    prompt = f"{PROMPT}\n\nMODUL:\n{module_block}"
    generated: PretestGenerated = llm.invoke(prompt)
    errors = validate_generated(generated)
    if errors:
        logger.warning(f"   -> WARN: Pretest modulu '{title}' má chyby, opakuji: {errors}")
        error_lines = "\n".join(f"- {e}" for e in errors)
        generated = llm.invoke(
            f"{prompt}\n\n"
            f"PŘEDCHOZÍ VÝSTUP:\n{generated.model_dump_json(indent=2)}\n\n"
            f"CHYBY V PŘEDCHOZÍM VÝSTUPU:\n{error_lines}\n\n"
            "Vrať celý výstup znovu a tyto chyby oprav."
        )
        errors = validate_generated(generated)
        if errors:
            raise ValueError(f"Pretest modulu '{title}' má i po opravě chyby: {errors}")

    return PretestSettings(
        closed=[
            _closed_item(q)
            for q in (generated.closed_question_1, generated.closed_question_2)
        ],
        open=generated.open_question.model_dump(),
    )


def _closed_item(q: ClosedQuestionGenerated) -> dict:
    """Zamíchá možnosti (LLM dává správnou odpověď na stejnou pozici) a správnou
    odpověď převede z textu na index. Shodu textu zaručuje validate_generated."""
    options = random.sample(q.options, len(q.options))
    return {
        "question": q.question,
        "options": options,
        "correct_index": options.index(q.correct_answer),
    }
