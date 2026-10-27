import logging
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.src.assessments.open_question_ai.agents.evaluator.state import EvaluatorState

logger = logging.getLogger(__name__)


def load_context(state: EvaluatorState) -> dict:
    """Načte modul a obsah LearnBlocku pro generování otázky."""
    logger.info("Načítám kontext pro generování procvičovací otázky...")

    db: Session = state["db"]
    module_id: int = state["module_id"]

    module: models.Module | None = (
        db.execute(
            select(models.Module)
            .options(joinedload(models.Module.learn_blocks))
            .where(
                models.Module.module_id == module_id,
                models.Module.is_active.is_(True),
            )
        )
        .unique()
        .scalars()
        .first()
    )

    if module is None:
        return {"error": "Modul nenalezen nebo není aktivní"}

    learn_blocks = [lb for lb in module.learn_blocks if lb.is_active]
    if not learn_blocks:
        return {"error": "Modul nemá žádný aktivní learn block"}

    learn_content = learn_blocks[0].content
    logger.info(f"Kontext načten: obsah ({len(learn_content)} zn.)")

    return {"learn_content": learn_content}
