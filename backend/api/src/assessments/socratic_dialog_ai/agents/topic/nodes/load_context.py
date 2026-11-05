import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.assessments.socratic_dialog_ai.agents.topic.state import TopicState

logger = logging.getLogger(__name__)


def load_context(state: TopicState) -> dict:
    """Načte obsah všech aktivních LearnBlocků modulu (v pořadí learn_id).
    Bez module_id (course_final) learn blocky všech modulů kurzu."""
    db: Session = state["db"]
    module_id = state["module_id"]

    stmt = (
        select(models.LearnBlock.content)
        .join(models.Module)
        .where(
            models.LearnBlock.is_active.is_(True),
            models.Module.is_active.is_(True),
        )
        .order_by(models.LearnBlock.learn_id)
    )
    if module_id is not None:
        stmt = stmt.where(models.LearnBlock.module_id == module_id)
    else:
        stmt = stmt.where(models.Module.course_id == state["course_id"])
    contents = db.scalars(stmt).all()

    if not contents:
        return {"error": "Modul/kurz nenalezen nebo nemá žádný aktivní learn block"}

    learn_content = "\n\n".join(contents)
    logger.info(f"Kontext načten: {len(contents)} learn blocků ({len(learn_content)} zn.)")
    return {"learn_content": learn_content}
