from agents.mentor.state import AgentState, LearnBlockQueryAttr

from api import models


def load_learn_block_data(state: AgentState) -> AgentState:
    """Uzlu pro načítaní dat z LearnBlocku."""
    print("Načítám data z LearnBlocku...")
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

    print(f"Načten LearnBlock: {learn_block.learn_id}")
    # state = {
    #     **state,
    #     "learn_block_query_attr": LearnBlockQueryAttr(
    #         course_id=learn_block.module.course.course_id,
    #         module_id=learn_block.module.module_id,
    #     ),
    # }

    return {
    "learn_block_query_attr": LearnBlockQueryAttr(
        course_id=learn_block.module.course.course_id,
        module_id=learn_block.module.module_id,
    ),
}