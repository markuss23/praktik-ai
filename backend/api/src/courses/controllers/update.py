"""
Controllery pro editaci zdrojů kurzu.
"""

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404
from api.src.courses.schemas import Course, CourseUpdate
from api.enums import Status
from api.authorization import validate_owner_or_superadmin, validate_guarantor_or_superadmin, validate_superadmin


def update_course(db: Session, course_id: int, course_data: CourseUpdate, user: models.User) -> Course:
    """Aktualizuje existující kurz (v draft nebo generated stavu)"""
    from sqlalchemy import select

    if db.execute(
        select(models.CourseBlock).where(
            models.CourseBlock.block_id == course_data.course_block_id,
            models.CourseBlock.is_active.is_(True),
        )
    ).first() is None:
        raise HTTPException(status_code=400, detail="Tematický blok s tímto ID neexistuje")

    if db.execute(
        select(models.CourseTarget).where(
            models.CourseTarget.target_id == course_data.course_target_id,
            models.CourseTarget.is_active.is_(True),
        )
    ).first() is None:
        raise HTTPException(status_code=400, detail="Cílová skupina s tímto ID neexistuje")

    if course_data.course_subject_id is not None and db.execute(
        select(models.CourseSubject).where(
            models.CourseSubject.subject_id == course_data.course_subject_id,
            models.CourseSubject.is_active.is_(True),
        )
    ).first() is None:
        raise HTTPException(status_code=400, detail="Obor s tímto ID neexistuje")

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    # Only owner or superadmin can edit (guarantor cannot edit others' courses)
    validate_owner_or_superadmin(course, user, "kurz")

    if course.status not in (Status.draft, Status.generated, Status.edited):
        raise HTTPException(
            status_code=400, detail="Lze upravovat pouze kurzy ve stavu koncept, vygenerovaný nebo editovaný"
        )

    update_data = course_data.model_dump(exclude_unset=True)

    # Auto-transition to "edited" when saving changes
    if course.status in (Status.draft, Status.generated):
        update_data["status"] = Status.edited

    db.execute(
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(**update_data)
    )
    db.commit()
    db.refresh(course)

    return Course.model_validate(course)


def update_course_status(db: Session, course_id: int, status: Status, user: models.User) -> Course:
    """Aktualizuje status kurzu"""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    valid_transitions = {
        Status.draft: {Status.in_review},
        Status.generated: {Status.in_review},
        Status.edited: {Status.in_review},
        Status.in_review: {Status.approved, Status.edited},
        Status.approved: {Status.archived, Status.edited},
    }

    allowed = valid_transitions.get(course.status, set())
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Neplatná změna statusu kurzu")

    # Role-based checks per transition type
    if status == Status.in_review:
        # Submit for review: only owner or superadmin
        validate_owner_or_superadmin(course, user, "kurz")
    elif course.status == Status.in_review and status in (Status.approved, Status.edited):
        # Approve or reject: only guarantor or superadmin
        validate_guarantor_or_superadmin(course, user, "kurz")
    elif course.status == Status.approved and status == Status.edited:
        # Revert approved course back to editing: superadmin only
        validate_superadmin(user, "kurz")
    else:
        # Other transitions (e.g. approved → archived): owner or superadmin
        validate_owner_or_superadmin(course, user, "kurz")

    values: dict = {"status": status}
    if status == Status.approved:
        if course.owner_id == user.user_id:
            raise HTTPException(status_code=400, detail="Vlastní kurz si nelze schválit")
        values["approved_by_id"] = user.user_id
    elif course.status == Status.approved and status == Status.edited:
        # Reverting from approved: unpublish and clear approval
        values["is_published"] = False
        values["approved_by_id"] = None

    db.execute(
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(**values)
    )
    db.commit()
    db.refresh(course)

    return Course.model_validate(course)


def update_course_published(db: Session, course_id: int, is_published: bool, user: models.User) -> Course:
    """Aktualizuje publikování kurzu"""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    # Only owner or superadmin can publish (guarantor cannot)
    validate_owner_or_superadmin(course, user, "kurz")

    # approved/archived: lze publikovat i odpublikovat
    if course.status not in (Status.approved, Status.archived):
        raise HTTPException(status_code=400, detail="Publikování lze měnit pouze u kurzu ve stavu 'approved' nebo 'archived'.")

    if is_published == course.is_published:
        raise HTTPException(
            status_code=400,
            detail="Kurz je již publikován." if is_published else "Kurz již není publikován.",
        )

    db.execute(
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(is_published=is_published)
    )
    db.commit()
    db.refresh(course)

    return Course.model_validate(course)
