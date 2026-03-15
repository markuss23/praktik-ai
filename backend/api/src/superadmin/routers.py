from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import require_role
from api.src.superadmin.schemas import MentorInteractionLogItem
from api.src.superadmin.controllers import get_mentor_interaction_logs

router = APIRouter(
    prefix="/superadmin",
    tags=["Superadmin"],
    dependencies=[require_role("superadmin")],
)


@router.get("/mentor-logs", operation_id="list_mentor_interaction_logs")
def endp_list_mentor_interaction_logs(
    db: SessionSqlSessionDependency,
    user_id: int | None = None,
) -> list[MentorInteractionLogItem]:
    """Vrátí seznam mentor interaction logů. Volitelně filtruje podle user_id."""
    return get_mentor_interaction_logs(db, user_id=user_id)
