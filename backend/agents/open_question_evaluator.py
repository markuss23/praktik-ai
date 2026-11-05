"""
Bezstavové vyhodnocení odpovědi na otevřenou otázku (vzorová odpověď + klíčové body).
Nic neukládá — vrací jen výsledek a zpětnou vazbu k zobrazení.
"""

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agents.base.llm import create_chat_llm, get_llm_config


class OpenQuestionEvaluation(BaseModel):
    is_correct: bool = Field(
        description="Zda odpověď zachycuje podstatu vzorové odpovědi"
    )
    feedback: str = Field(description="Zpětná vazba v 1-3 větách, v češtině")


async def evaluate_open_question(
    db: Session,
    question: str,
    example_answer: str | None,
    keywords: list[str],
    user_input: str,
    prompt: str | None = None,
) -> OpenQuestionEvaluation:
    """`prompt` přepíše systémový prompt z DB (formát s vlastním .md, např. pretest)."""
    cfg = get_llm_config(db, "open_question_evaluator")
    llm = create_chat_llm(cfg.model).with_structured_output(
        OpenQuestionEvaluation, method="json_schema"
    )

    return await llm.ainvoke(
        [
            SystemMessage(content=prompt or cfg.prompt),
            HumanMessage(
                content=(
                    f"OTÁZKA:\n{question}\n\n"
                    f"VZOROVÁ ODPOVĚĎ:\n{example_answer or '-'}\n\n"
                    f"KLÍČOVÉ BODY:\n{', '.join(keywords) or '-'}\n\n"
                    f"ODPOVĚĎ STUDENTA:\n{user_input}"
                )
            ),
        ]
    )
