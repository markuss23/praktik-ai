from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.src.superadmin.schemas import MentorInteractionLogItem


def get_mentor_interaction_logs(
    db: Session,
    user_id: int | None = None,
) -> list[MentorInteractionLogItem]:
    """Vrátí seznam mentor interaction logů, volitelně filtrovaný podle user_id."""
    try:
        stm = select(models.MentorInteractionLog).where(
            models.MentorInteractionLog.is_active.is_(True)
        )

        if user_id is not None:
            stm = stm.where(models.MentorInteractionLog.user_id == user_id)

        stm = stm.order_by(models.MentorInteractionLog.created_at.desc())

        logs = db.execute(stm).scalars().all()
        return [MentorInteractionLogItem.model_validate(log) for log in logs]
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_mentor_interaction_logs error: {e}")
        raise HTTPException(status_code=500, detail="Nečekaná chyba serveru") from e
