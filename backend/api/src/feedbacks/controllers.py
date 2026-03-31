from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.src.common.utils import get_or_404
from api.enums import Status, UserRole
from api.src.feedbacks.schemas import FeedbackItem, FeedbackSection, FeedbackCourse


def get_feedback_section(
    db: Session,
    course_id: int,
    actor: models.User,
    reply_filter: str | None = None,
) -> FeedbackSection:
    """
    reply_filter:
      None / "all"      – vše
      "with_reply"      – pouze okomentované (reply IS NOT NULL)
      "without_reply"   – pouze neokomentované (reply IS NULL)
    """
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    stm = (
        select(models.CourseFeedback)
        .options(
            joinedload(models.CourseFeedback.module),
            joinedload(models.CourseFeedback.author),
        )
        .where(
            models.CourseFeedback.course_id == course_id,
            models.CourseFeedback.is_active.is_(True),
        )
        .order_by(models.CourseFeedback.created_at.asc())
    )

    if reply_filter == "with_reply":
        stm = stm.where(models.CourseFeedback.reply.isnot(None))
    elif reply_filter == "without_reply":
        stm = stm.where(models.CourseFeedback.reply.is_(None))

    feedbacks = db.scalars(stm).all()

    return FeedbackSection(
        course=FeedbackCourse.model_validate(course),
        feedbacks=[FeedbackItem.model_validate(f) for f in feedbacks],
    )


def create_feedback(
    db: Session,
    course_id: int,
    feedback_text: str,
    actor: models.User,
    module_id: int | None = None,
    content_type: str | None = None,
    content_ref: str | None = None,
) -> FeedbackItem:
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    if course.status != Status.in_review and course.status != Status.edited:
        raise HTTPException(
            status_code=422,
            detail="Feedback lze přidat pouze ke kurzu ve stavu 'in_review' nebo 'edited'",
        )

    if not feedback_text.strip():
        raise HTTPException(status_code=422, detail="Text feedbacku nesmí být prázdný")

    # Validate module belongs to the course if provided
    if module_id is not None:
        module = db.get(models.Module, module_id)
        if not module or module.course_id != course_id:
            raise HTTPException(status_code=422, detail="Modul nepatří k tomuto kurzu")

    feedback = models.CourseFeedback(
        course_id=course_id,
        author_id=actor.user_id,
        feedback=feedback_text,
        module_id=module_id,
        content_type=content_type,
        content_ref=content_ref,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    db.refresh(feedback, ["author"])
    if feedback.module_id:
        db.refresh(feedback, ["module"])
    return FeedbackItem.model_validate(feedback)


def reply_to_feedback(
    db: Session,
    feedback_id: int,
    reply_text: str,
    actor: models.User,
) -> FeedbackItem:
    feedback = get_or_404(db, models.CourseFeedback, feedback_id, detail="Feedback nenalezen")

    if feedback.course.owner_id != actor.user_id:
        raise HTTPException(
            status_code=403,
            detail="Pouze autor kurzu může odpovědět na feedback",
        )

    if feedback.reply is not None:
        raise HTTPException(status_code=409, detail="Na tento feedback již byla přidána odpověď")

    if not reply_text.strip():
        raise HTTPException(status_code=422, detail="Text odpovědi nesmí být prázdný")

    feedback.reply = reply_text
    db.commit()
    db.refresh(feedback)
    db.refresh(feedback, ["author"])
    if feedback.module_id:
        db.refresh(feedback, ["module"])
    return FeedbackItem.model_validate(feedback)


def resolve_feedback(
    db: Session,
    feedback_id: int,
    is_resolved: bool,
    actor: models.User,
) -> FeedbackItem:
    feedback = get_or_404(db, models.CourseFeedback, feedback_id, detail="Feedback nenalezen")

    if feedback.course.owner_id != actor.user_id:
        raise HTTPException(
            status_code=403,
            detail="Pouze autor kurzu může označit feedback jako vyřešený",
        )

    feedback.is_resolved = is_resolved
    db.commit()
    db.refresh(feedback)
    db.refresh(feedback, ["author"])
    if feedback.module_id:
        db.refresh(feedback, ["module"])
    return FeedbackItem.model_validate(feedback)


def delete_feedback(db: Session, feedback_id: int, actor: models.User) -> None:
    feedback = get_or_404(db, models.CourseFeedback, feedback_id, detail="Feedback nenalezen")

    if actor.role == UserRole.superadmin:
        pass
    elif actor.role == UserRole.guarantor:
        if feedback.author_id != actor.user_id:
            raise HTTPException(
                status_code=403,
                detail="Garant může smazat pouze vlastní feedback",
            )
        if feedback.reply is not None:
            raise HTTPException(
                status_code=403,
                detail="Feedback s odpovědí autora nelze smazat",
            )
    else:
        raise HTTPException(status_code=403, detail="Nedostatečná oprávnění")

    feedback.is_active = False
    db.commit()
