from sqlalchemy.orm import Session

from api import models
from agents.practice_question_generator.state import GeneratorState


def persist_question(state: GeneratorState) -> dict:
    """Uloží vygenerovanou procvičovací otázku do DB."""
    print("Ukládám procvičovací otázku...")

    if state.get("error"):
        return {}

    db: Session = state["db"]

    question = models.UserPracticeQuestion(
        user_id=state["user_id"],
        module_id=state["module_id"],
        question_type=state["question_type"],
        user_input=state["learn_content"][:500],
        generated_question=state["generated_question"],
        options=state.get("options"),
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    print(f"UserPracticeQuestion {question.user_question_id} uložena")
    return {"user_question_id": question.user_question_id}
