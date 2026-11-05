from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import require_role
from api.src.superadmin.schemas import (
    MentorInteractionLogItem,
    SystemSettingResponse,
    SystemSettingUpdate,
)
from api.src.superadmin.controllers import (
    get_mentor_interaction_logs,
    list_system_settings,
    update_system_setting,
)

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


@router.get("/settings", operation_id="list_system_settings")
def endp_list_system_settings(
    db: SessionSqlSessionDependency,
) -> list[SystemSettingResponse]:
    """Vrátí všechna systémová nastavení pro správu LLM agentů."""
    return list_system_settings(db)


@router.put("/settings/{setting_id}", operation_id="update_system_setting")
def endp_update_system_setting(
    setting_id: int,
    payload: SystemSettingUpdate,
    db: SessionSqlSessionDependency,
) -> SystemSettingResponse:
    """Aktualizuje systémové nastavení (model, prompt)."""
    return update_system_setting(db, setting_id, payload)
