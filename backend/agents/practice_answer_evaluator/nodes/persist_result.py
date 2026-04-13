from sqlalchemy.orm import Session

from api import models
from agents.practice_answer_evaluator.state import EvaluatorState


def persist_result(state: EvaluatorState) -> dict:
    """Uloží UserPracticeAttempt s výsledkem vyhodnocení."""
    print("Ukládám výsledek procvičovacího pokusu...")

    if state.get("error"):
        return {}

    db: Session = state["db"]

    attempt = models.UserPracticeAttempt(
        user_question_id=state["user_question_id"],
        user_input=state["user_input"],
        ai_response=state["ai_response"],
        is_correct=state["is_correct"],
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    print(f"UserPracticeAttempt {attempt.attempt_id} uložen (correct={state['is_correct']})")
    return {"attempt_id": attempt.attempt_id}
