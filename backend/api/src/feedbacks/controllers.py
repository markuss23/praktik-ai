from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.enums import Status, UserRole
from api.src.feedbacks.schemas import FeedbackItem, FeedbackSection, FeedbackCourse


def _get_course_or_404(db: Session, course_id: int) -> models.Course:
    course = db.scalar(
        select(models.Course).where(
            models.Course.course_id == course_id,
            models.Course.is_active.is_(True),
        )
    )
    if course is None:
        raise HTTPException(status_code=404, detail="Kurz nenalezen")
    return course


def _get_feedback_or_404(db: Session, feedback_id: int) -> models.CourseFeedback:
    feedback = db.scalar(
        select(models.CourseFeedback).where(
            models.CourseFeedback.feedback_id == feedback_id,
            models.CourseFeedback.is_active.is_(True),
        )
    )
    if feedback is None:
        raise HTTPException(status_code=404, detail="Feedback nenalezen")
    return feedback


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
    course = _get_course_or_404(db, course_id)

    stm = (
        select(models.CourseFeedback)
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
) -> FeedbackItem:
    course = _get_course_or_404(db, course_id)

    if course.status != Status.in_review and course.status != Status.edited:
        raise HTTPException(
            status_code=422,
            detail="Feedback lze přidat pouze ke kurzu ve stavu 'in_review' nebo 'edited'",
        )

    if not feedback_text.strip():
        raise HTTPException(status_code=422, detail="Text feedbacku nesmí být prázdný")

    feedback = models.CourseFeedback(
        course_id=course_id,
        author_id=actor.user_id,
        feedback=feedback_text,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return FeedbackItem.model_validate(feedback)


def reply_to_feedback(
    db: Session,
    feedback_id: int,
    reply_text: str,
    actor: models.User,
) -> FeedbackItem:
    feedback = _get_feedback_or_404(db, feedback_id)

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
    return FeedbackItem.model_validate(feedback)


def delete_feedback(db: Session, feedback_id: int, actor: models.User) -> None:
    feedback = _get_feedback_or_404(db, feedback_id)

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
