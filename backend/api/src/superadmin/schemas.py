from datetime import datetime

from pydantic import BaseModel

from api.src.common.schemas import ORMModel


class MentorInteractionLogItem(ORMModel):
    log_id: int
    user_id: int
    learn_id: int
    user_message: str
    ai_response: str
    created_at: datetime


# ---------- SystemSetting ----------


class SystemSettingResponse(ORMModel):
    setting_id: int
    name: str
    key: str
    model: str
    prompt: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class SystemSettingUpdate(BaseModel):
    name: str | None = None
    model: str | None = None
    prompt: str | None = None
    description: str | None = None
