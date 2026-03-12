from datetime import datetime

from api.src.common.schemas import ORMModel


class MentorInteractionLogItem(ORMModel):
    log_id: int
    user_id: int
    learn_id: int
    user_message: str
    ai_response: str
    created_at: datetime
