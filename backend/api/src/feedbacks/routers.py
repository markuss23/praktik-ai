from typing import Literal
from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.feedbacks.schemas import FeedbackSection, FeedbackItem, FeedbackCreate, FeedbackReply, FeedbackResolve
from api.src.feedbacks.controllers import (
    get_feedback_section,
    create_feedback,
    reply_to_feedback,
    resolve_feedback,
    delete_feedback,
)

router = APIRouter(prefix="/feedbacks", tags=["Feedbacks"])


@router.get("", operation_id="get_feedback_section", dependencies=[require_role("lector")])
def endp_get_feedback_section(
    course_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
    reply_filter: Literal["all", "with_reply", "without_reply"] = "all",
) -> FeedbackSection:
    """Vrátí feedback sekci kurzu. reply_filter: all | with_reply | without_reply."""
    return get_feedback_section(db, course_id=course_id, actor=actor, reply_filter=reply_filter)


@router.post("", operation_id="create_feedback", status_code=201, dependencies=[require_role("guarantor")])
def endp_create_feedback(
    data: FeedbackCreate,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> FeedbackItem:
    """Přidá feedback ke kurzu. Kurz musí být ve stavu 'in_review'."""
    return create_feedback(
        db,
        module_id=data.module_id,
        feedback_text=data.feedback,
        actor=actor,
        content_type=data.content_type,
        content_ref=data.content_ref,
    )


@router.patch("/{feedback_id}/reply", operation_id="reply_to_feedback", dependencies=[require_role("lector")])
def endp_reply_to_feedback(
    feedback_id: int,
    data: FeedbackReply,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> FeedbackItem:
    """Autor kurzu přidá odpověď na feedback garanta."""
    return reply_to_feedback(db, feedback_id=feedback_id, reply_text=data.reply, actor=actor)


@router.patch("/{feedback_id}/resolve", operation_id="resolve_feedback", dependencies=[require_role("lector")])
def endp_resolve_feedback(
    feedback_id: int,
    data: FeedbackResolve,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> FeedbackItem:
    """Autor kurzu označí feedback jako vyřešený / nevyřešený."""
    return resolve_feedback(db, feedback_id=feedback_id, is_resolved=data.is_resolved, actor=actor)


@router.delete("/{feedback_id}", operation_id="delete_feedback", status_code=204, dependencies=[require_role("guarantor")])
def endp_delete_feedback(
    feedback_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> None:
    """Soft-delete feedbacku. Garant může smazat vlastní feedback bez odpovědi. Superadmin bez omezení."""
    delete_feedback(db, feedback_id=feedback_id, actor=actor)
