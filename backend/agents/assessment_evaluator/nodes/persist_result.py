from sqlalchemy import func
from sqlalchemy.orm import Session

from api import models
from api.enums import AttemptStatus, ModuleTaskSessionStatus
from agents.assessment_evaluator.state import EvaluationState


def persist_result(state: EvaluationState) -> dict:
    """Uloží TaskAttempt a aktualizuje status session."""
    print("Ukládám výsledek hodnocení...")

    if state.get("error"):
        return {}

    db: Session = state["db"]
    session_id: int = state["session_id"]
    ai_score: int = state["ai_score"]
    ai_feedback: str = state["ai_feedback"]
    is_passed: bool = state["is_passed"]
    user_response: str = state["user_response"]

    # Vytvoř TaskAttempt
    attempt = models.TaskAttempt(
        session_id=session_id,
        user_response=user_response,
        status=AttemptStatus.evaluated,
        ai_feedback=ai_feedback,
        ai_score=ai_score,
        is_passed=is_passed,
    )
    db.add(attempt)
    db.flush()

    # Aktualizuj status session
    session: models.ModuleTaskSession = db.get(models.ModuleTaskSession, session_id)
    if is_passed:
        session.status = ModuleTaskSessionStatus.passed
    else:
        # Zkontroluj, zda byly vyčerpány všechny pokusy
        max_attempts = session.module.max_task_attempts
        evaluated_count = (
            db.query(func.count(models.TaskAttempt.attempt_id))
            .filter(
                models.TaskAttempt.session_id == session_id,
                models.TaskAttempt.status == AttemptStatus.evaluated,
            )
            .scalar()
        )
        if evaluated_count >= max_attempts:
            session.status = ModuleTaskSessionStatus.failed
        else:
            session.status = ModuleTaskSessionStatus.in_progress

    db.commit()
    db.refresh(attempt)

    print(f"TaskAttempt {attempt.attempt_id} uložen (score={ai_score}, passed={is_passed})")

    return {"attempt_id": attempt.attempt_id}
