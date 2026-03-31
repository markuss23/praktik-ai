from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from agents.practice_answer_evaluator.state import EvaluatorState


def load_context(state: EvaluatorState) -> dict:
    """Načte otázku a obsah LearnBlocku pro vyhodnocení odpovědi."""
    print("Načítám kontext pro vyhodnocení procvičovací odpovědi...")

    db: Session = state["db"]
    user_question_id: int = state["user_question_id"]

    question: models.UserPracticeQuestion | None = (
        db.execute(
            select(models.UserPracticeQuestion)
            .options(
                joinedload(models.UserPracticeQuestion.module)
                .joinedload(models.Module.learn_blocks)
            )
            .where(
                models.UserPracticeQuestion.user_question_id == user_question_id,
                models.UserPracticeQuestion.is_active.is_(True),
            )
        )
        .unique()
        .scalars()
        .first()
    )

    if question is None:
        return {"error": "Procvičovací otázka nenalezena"}

    module = question.module
    if module is None or not module.is_active:
        return {"error": "Modul nenalezen nebo není aktivní"}

    learn_blocks = [lb for lb in module.learn_blocks if lb.is_active]
    if not learn_blocks:
        return {"error": "Modul nemá žádný aktivní learn block"}

    learn_content = learn_blocks[0].content
    print(f"Kontext načten pro otázku {user_question_id}")

    return {
        "learn_content": learn_content,
        "generated_question": question.generated_question,
    }
