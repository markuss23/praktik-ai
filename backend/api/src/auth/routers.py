from typing import Annotated
from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordRequestForm

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, auth, oauth2_bearer
from api.notifications.email_log import event_label, list_user_email_log
from api.notifications.preferences import list_preferences, update_preferences
from api.src.auth.schemas import (
    EmailLogItem,
    EmailLogPage,
    NotificationPreferenceItem,
    NotificationPreferencesUpdate,
    ProfileNameUpdate,
    ProfileUpdate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token")
def endp_token(
    user_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionSqlSessionDependency,
) -> dict:
    token = auth.get_token(user_data.username, user_data.password)
    auth.sync_user_from_token(token["access_token"], db)
    return token


@router.post("/sync")
def endp_sync(
    token: Annotated[str, Depends(oauth2_bearer)],
    db: SessionSqlSessionDependency,
) -> UserResponse:
    """Called after PKCE login to sync user from Keycloak token to DB."""
    user = auth.sync_user_from_token(token, db)
    if user is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Token sync failed")
    return UserResponse.model_validate(user)


@router.get("/me")
def endp_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.put("/profile")
def endp_update_profile(
    data: ProfileUpdate,
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> UserResponse:
    """Aktualizuje AI preference profilu přihlášeného uživatele."""
    current_user.ai_tone = data.ai_tone
    current_user.ai_expression_level = data.ai_expression_level
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/profile/name")
def endp_update_profile_name(
    data: ProfileNameUpdate,
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> UserResponse:
    """Aktualizuje zobrazované jméno profilu přihlášeného uživatele."""
    current_user.display_name = data.display_name
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/profile/notifications")
def endp_get_notification_preferences(
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> list[NotificationPreferenceItem]:
    """Vrátí nastavení e-mailových notifikací přihlášeného uživatele (jen pro jeho roli)."""
    return [NotificationPreferenceItem(**item) for item in list_preferences(db, current_user)]


@router.put("/profile/notifications")
def endp_update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
) -> list[NotificationPreferenceItem]:
    """
    Zapne nebo vypne e-mailové notifikace přihlášeného uživatele.
    Povinné a pro roli nerelevantní notifikace se ignorují.
    """
    update_preferences(db, current_user, {item.event_key: item.enabled for item in data.items})
    return [NotificationPreferenceItem(**item) for item in list_preferences(db, current_user)]


@router.get("/profile/notifications/history")
def endp_get_email_history(
    current_user: CurrentUser,
    db: SessionSqlSessionDependency,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EmailLogPage:
    """Vrátí historii e-mailů odeslaných přihlášenému uživateli, nejnovější první."""
    items, total = list_user_email_log(db, current_user.user_id, limit, offset)
    return EmailLogPage(
        items=[
            EmailLogItem(
                log_id=log.log_id,
                event_key=log.event_key,
                label=event_label(log.event_key),
                course_id=log.course_id,
                course_title=log.course.title if log.course else None,
                subject=log.subject,
                body=log.body,
                status=log.status,
                created_at=log.created_at,
            )
            for log in items
        ],
        total=total,
    )
