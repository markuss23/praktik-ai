import logging
import random
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.base.llm import create_chat_llm, get_llm_config
from api import models
from api.src.assessments.closed_questions.schemas import ClosedQuestionItem
from api.src.assessments.closed_questions_ai.agents.generator.state import (
    GeneratorState,
)

logger = logging.getLogger(__name__)


PROMPT_KEY = "closed_questions_ai"
PROMPT = (Path(__file__).parent / "prompt.md").read_text(encoding="utf-8")


# Výstup LLM — bez min/max omezení (structured output je nepodporuje),
# validuje se až převodem na ClosedQuestionItem
class GeneratedQuestion(BaseModel):
    question: str = Field(description="Text otázky")
    options: list[str] = Field(description="3–4 nabízené možnosti")
    correct_index: int = Field(description="Index správné možnosti v options (od 0)")


class GeneratedQuestions(BaseModel):
    questions: list[GeneratedQuestion]


def load_context(state: GeneratorState) -> dict:
    """Načte obsah learn blocků — jednoho modulu, u course_final všech modulů kurzu."""
    logger.info("Načítám kontext pro generování uzavřených otázek...")

    db: Session = state["db"]
    module_id: int | None = state["module_id"]

    stmt = (
        select(models.LearnBlock)
        .join(models.LearnBlock.module)
        .where(
            models.Module.course_id == state["course_id"],
            models.Module.is_active.is_(True),
            models.LearnBlock.is_active.is_(True),
        )
        .order_by(models.Module.module_id, models.LearnBlock.learn_id)
    )
    if module_id is not None:
        stmt = stmt.where(models.Module.module_id == module_id)

    learn_blocks = db.scalars(stmt).all()
    if not learn_blocks:
        return {"error": "Modul/kurz nemá žádný aktivní learn block"}

    learn_content = "\n\n".join(f"## {lb.title}\n{lb.content}" for lb in learn_blocks)
    logger.info(f"Kontext načten: {len(learn_blocks)} bloků ({len(learn_content)} zn.)")

    return {"learn_content": learn_content}


def generate_questions(state: GeneratorState) -> dict:
    if state.get("error"):
        return {}

    count = state["count"]
    cfg = get_llm_config(state["db"], PROMPT_KEY)
    llm = create_chat_llm(cfg.model).with_structured_output(
        GeneratedQuestions, method="json_schema"
    )

    output: GeneratedQuestions = llm.invoke(
        [
            SystemMessage(content=PROMPT),
            HumanMessage(
                content=f"POČET OTÁZEK: {count}\n\nVÝUKOVÝ TEXT:\n{state['learn_content']}"
            ),
        ]
    )

    questions = []
    for generated in output.questions[:count]:
        try:
            questions.append(_shuffled(ClosedQuestionItem(**generated.model_dump())))
        except ValidationError as e:
            logger.warning(f"Přeskakuji nevalidní otázku: {e}")

    if not questions:
        return {"error": "AI nevygenerovala žádnou validní otázku"}

    logger.info(f"Vygenerováno {len(questions)}/{count} otázek")
    return {"questions": questions}


def _shuffled(item: ClosedQuestionItem) -> ClosedQuestionItem:
    """Zamíchá možnosti — LLM má sklon dávat správnou odpověď na stejnou pozici."""
    correct = item.options[item.correct_index]
    options = random.sample(item.options, len(item.options))
    return item.model_copy(
        update={"options": options, "correct_index": options.index(correct)}
    )


if __name__ == "__main__":
    item = ClosedQuestionItem(question="Q?", options=["a", "b", "c"], correct_index=1)
    for _ in range(20):
        s = _shuffled(item)
        assert sorted(s.options) == ["a", "b", "c"] and s.options[s.correct_index] == "b"
    print("ok")
