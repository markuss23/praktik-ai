import logging
from agents.mentor.state import AgentState, LearnBlockQueryAttr

from api import models
from api.enums import MentorScope
from api.src.users.controllers import get_user_ai_style

logger = logging.getLogger(__name__)

HISTORY_LIMIT = 6


def load_learn_block_data(state: AgentState) -> AgentState:
    """Uzlu pro načítaní dat z LearnBlocku (nebo jen kurzu), AI stylu a historie konverzace."""
    logger.info("Načítám data z LearnBlocku...")
    db = state["db"]
    learn_block_id = state.get("learn_block_id")
    log_model = models.MentorInteractionLog

    learn_block: models.LearnBlock | None = None
    if learn_block_id is not None:
        learn_block = (
            db.query(models.LearnBlock)
            .filter(models.LearnBlock.learn_id == learn_block_id)
            .where(models.LearnBlock.is_active.is_(True))
            .first()
        )
        if learn_block is None:
            return {"message": "Learn block nenalezen"}
        logger.info(f"Načten LearnBlock: {learn_block.learn_id}")

    course = db.get(models.Course, state["course_id"])
    module = learn_block.module if learn_block else None
    ai_style = get_user_ai_style(db, state["user_id"])

    history: list[tuple[str, str]] = []
    if state.get("use_history", True):
        # Historie se nemíchá: module chat = jen tento blok, course chat = celý kurz
        if state.get("scope", MentorScope.module) == MentorScope.course:
            where = [log_model.course_id == course.course_id, log_model.scope == MentorScope.course]
        else:
            where = [log_model.learn_id == learn_block_id, log_model.scope == MentorScope.module]
        logs = (
            db.query(log_model)
            .filter(log_model.user_id == state["user_id"], log_model.is_active.is_(True), *where)
            .order_by(log_model.created_at.desc(), log_model.log_id.desc())
            .limit(HISTORY_LIMIT)
            .all()
        )
        history = [(log.user_message, log.ai_response) for log in reversed(logs)]

    return {
        "learn_block_query_attr": LearnBlockQueryAttr(
            course_id=course.course_id,
            module_id=module.module_id if module else None,
        ),
        "course_title": course.title,
        "module_title": module.title if module else "",
        "learn_block_title": learn_block.title if learn_block else "",
        "learn_block_content": learn_block.content if learn_block else "",
        "ai_style": format_ai_style(ai_style),
        "ai_style_codes": [o.code for o in ai_style],
        "history": history,
    }


def format_ai_style(options: list[models.AiStyleOption]) -> str:
    """Styl komunikace pro prompt — jeden řádek na osu s popisem chování agenta."""
    return "\n".join(
        f"- {o.axis.name}: {o.name} — {o.description}" for o in options
    )
