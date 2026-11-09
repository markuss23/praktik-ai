from datetime import datetime

from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.ai_usage.controllers import get_ai_usage_summary
from api.src.ai_usage.schemas import AiUsageSummary

router = APIRouter(prefix="/ai-usage", tags=["AI Usage"])

admin_router = APIRouter(
    prefix="/ai-usage/admin",
    tags=["AI Usage"],
    dependencies=[require_role("superadmin")],
)


@router.get("/me", operation_id="get_my_ai_usage")
def endp_get_my_ai_usage(
    user: CurrentUser,
    db: SessionSqlSessionDependency,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> AiUsageSummary:
    """
    Vrátí spotřebu AI tokenů přihlášeného uživatele rozdělenou podle služby a modelu.

    """
    return get_ai_usage_summary(
        db, user_id=user.user_id, date_from=date_from, date_to=date_to
    )


@admin_router.get("", operation_id="get_ai_usage_admin")
def endp_get_ai_usage_admin(
    db: SessionSqlSessionDependency,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> AiUsageSummary:
    """
    Vrátí spotřebu AI tokenů libovolného uživatele, nebo celé platformy. Jen superadmin.

    """
    return get_ai_usage_summary(
        db, user_id=user_id, date_from=date_from, date_to=date_to
    )
