import logging
from agents.mentor.state import AgentState, LearnBlockQueryAttr

from api import models
from api.src.users.controllers import get_user_ai_style

logger = logging.getLogger(__name__)

HISTORY_LIMIT = 6


def load_learn_block_data(state: AgentState) -> AgentState:
    """Uzlu pro načítaní dat z LearnBlocku, AI stylu a historie konverzace."""
    logger.info("Načítám data z LearnBlocku...")
    db = state["db"]
    learn_block_id = state["learn_block_id"]

    learn_block: models.LearnBlock | None = (
        db.query(models.LearnBlock)
        .filter(models.LearnBlock.learn_id == learn_block_id)
        .where(models.LearnBlock.is_active.is_(True))
        .first()
    )

    if learn_block is None:
        return {"message": "Learn block nenalezen"}

    logger.info(f"Načten LearnBlock: {learn_block.learn_id}")

    module = learn_block.module
    ai_style = get_user_ai_style(db, state["user_id"])

    history: list[tuple[str, str]] = []
    if state.get("use_history", True):
        logs = (
            db.query(models.MentorInteractionLog)
            .filter(
                models.MentorInteractionLog.user_id == state["user_id"],
                models.MentorInteractionLog.learn_id == learn_block_id,
                models.MentorInteractionLog.is_active.is_(True),
            )
            .order_by(models.MentorInteractionLog.created_at.desc())
            .limit(HISTORY_LIMIT)
            .all()
        )
        history = [(log.user_message, log.ai_response) for log in reversed(logs)]

    return {
        "learn_block_query_attr": LearnBlockQueryAttr(
            course_id=module.course.course_id,
            module_id=module.module_id,
        ),
        "course_title": module.course.title,
        "module_title": module.title,
        "learn_block_title": learn_block.title,
        "learn_block_content": learn_block.content,
        "ai_style": format_ai_style(ai_style),
        "ai_style_codes": [o.code for o in ai_style],
        "history": history,
    }


def format_ai_style(options: list[models.AiStyleOption]) -> str:
    """Styl komunikace pro prompt — jeden řádek na osu s popisem chování agenta."""
    return "\n".join(
        f"- {o.axis.name}: {o.name} — {o.description}" for o in options
    )
