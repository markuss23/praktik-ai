from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.superadmin.schemas import (
    MentorInteractionLogItem,
    SystemSettingResponse,
    SystemSettingUpdate,
)
from api.src.common.utils import get_or_404


def get_mentor_interaction_logs(
    db: Session,
    user_id: int | None = None,
) -> list[MentorInteractionLogItem]:
    """Vrátí seznam mentor interaction logů, volitelně filtrovaný podle user_id."""
    stm = select(models.MentorInteractionLog).where(
        models.MentorInteractionLog.is_active.is_(True)
    )

    if user_id is not None:
        stm = stm.where(models.MentorInteractionLog.user_id == user_id)

    stm = stm.order_by(models.MentorInteractionLog.created_at.desc())

    logs = db.execute(stm).scalars().all()
    return [MentorInteractionLogItem.model_validate(log) for log in logs]


# ---------- SystemSetting ----------


def list_system_settings(db: Session) -> list[SystemSettingResponse]:
    """Vrátí všechna aktivní systémová nastavení."""
    stm = (
        select(models.SystemSetting)
        .where(models.SystemSetting.is_active.is_(True))
        .order_by(models.SystemSetting.key)
    )
    rows = db.execute(stm).scalars().all()
    return [SystemSettingResponse.model_validate(row) for row in rows]


def update_system_setting(
    db: Session,
    setting_id: int,
    payload: SystemSettingUpdate,
) -> SystemSettingResponse:
    """Aktualizuje systémové nastavení (model, prompt, name, description)."""
    setting = get_or_404(
        db, models.SystemSetting, setting_id, detail="Nastavení nenalezeno"
    )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(setting, field, value)

    db.commit()
    db.refresh(setting)
    return SystemSettingResponse.model_validate(setting)
