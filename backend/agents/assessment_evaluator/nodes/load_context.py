from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.enums import ModuleTaskSessionStatus
from agents.assessment_evaluator.state import EvaluationState


def load_context(state: EvaluationState) -> dict:
    """Načte session, otázku a learn block obsah pro vyhodnocení."""
    print("Načítám kontext pro vyhodnocení...")

    db: Session = state["db"]
    session_id: int = state["session_id"]
    user_id: int = state["user_id"]

    # Načti session s modulem a learn blocky
    session: models.ModuleTaskSession | None = (
        db.execute(
            select(models.ModuleTaskSession)
            .options(
                joinedload(models.ModuleTaskSession.module)
                .joinedload(models.Module.learn_blocks)
            )
            .where(
                models.ModuleTaskSession.session_id == session_id,
                models.ModuleTaskSession.user_id == user_id,
                models.ModuleTaskSession.is_active.is_(True),
            )
        )
        .unique()
        .scalars()
        .first()
    )

    if session is None:
        return {"error": "Assessment session nenalezena"}

    if session.status != ModuleTaskSessionStatus.in_progress:
        return {"error": f"Session není ve stavu in_progress (aktuální: {session.status.value})"}

    if not session.generated_task:
        return {"error": "Session nemá vygenerovanou otázku"}

    module = session.module
    if module is None or not module.is_active:
        return {"error": "Modul nenalezen nebo není aktivní"}

    learn_blocks = module.learn_blocks
    if not learn_blocks:
        return {"error": "Modul nemá žádný learn block"}

    learn_content = learn_blocks[0].content
    print(f"Kontext načten: otázka ({len(session.generated_task)} zn.), obsah ({len(learn_content)} zn.)")

    return {
        "learn_content": learn_content,
        "generated_question": session.generated_task,
        "passing_score": module.passing_score,
    }
