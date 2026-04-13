from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import require_role
from api.src.superadmin.schemas import (
    MentorInteractionLogItem,
    SystemSettingResponse,
    SystemSettingUpdate,
    TaskSessionResponse,
    TaskSessionStatusUpdate,
)
from api.src.superadmin.controllers import (
    get_mentor_interaction_logs,
    list_system_settings,
    update_system_setting,
    list_task_sessions,
    update_task_session_status,
    delete_task_session,
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


# ---------- TaskSession ----------


@router.get("/task-sessions", operation_id="list_task_sessions")
def endp_list_task_sessions(
    db: SessionSqlSessionDependency,
    user_id: int | None = None,
    module_id: int | None = None,
) -> list[TaskSessionResponse]:
    """Vrátí seznam assessment sessions. Filtrovat lze podle user_id a module_id."""
    return list_task_sessions(db, user_id=user_id, module_id=module_id)


@router.patch("/task-sessions/{session_id}/status", operation_id="update_task_session_status")
def endp_update_task_session_status(
    session_id: int,
    payload: TaskSessionStatusUpdate,
    db: SessionSqlSessionDependency,
) -> TaskSessionResponse:
    """Změní status assessment session (in_progress / passed / failed)."""
    return update_task_session_status(db, session_id, payload)


@router.delete("/task-sessions/{session_id}", operation_id="delete_task_session")
def endp_delete_task_session(
    session_id: int,
    db: SessionSqlSessionDependency,
) -> TaskSessionResponse:
    """Soft-delete assessment session (is_active = False)."""
    return delete_task_session(db, session_id)
