"""
Bezstavové vyhodnocení odpovědi na sdílenou otevřenou PracticeQuestion.
Nic neukládá — vrací jen výsledek a zpětnou vazbu k zobrazení.
"""

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agents.base.llm import create_chat_llm, get_llm_config
from api import models


class OpenQuestionEvaluation(BaseModel):
    is_correct: bool = Field(
        description="Zda odpověď zachycuje podstatu vzorové odpovědi"
    )
    feedback: str = Field(description="Zpětná vazba v 1-3 větách, v češtině")


async def evaluate_open_question(
    db: Session, question: models.PracticeQuestion, user_input: str
) -> OpenQuestionEvaluation:
    cfg = get_llm_config(db, "open_question_evaluator")
    llm = create_chat_llm(cfg.model).with_structured_output(
        OpenQuestionEvaluation, method="json_schema"
    )

    keywords = ", ".join(k.keyword for k in question.open_keywords) or "-"
    return await llm.ainvoke(
        [
            SystemMessage(content=cfg.prompt),
            HumanMessage(
                content=(
                    f"OTÁZKA:\n{question.question}\n\n"
                    f"VZOROVÁ ODPOVĚĎ:\n{question.example_answer or '-'}\n\n"
                    f"KLÍČOVÉ BODY:\n{keywords}\n\n"
                    f"ODPOVĚĎ STUDENTA:\n{user_input}"
                )
            ),
        ]
    )
