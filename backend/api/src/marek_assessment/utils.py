from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.enums import AssessmentContext, AssessmentSessionStatus


def find_course_assessment(
    db: Session,
    course_id: int,
    context: AssessmentContext,
    module_id: int | None,
    assessment_type_code: str | None,
) -> models.CourseAssessment:
    """Najde konfiguraci formátu podle course_id/context(/module_id/kódu).

    Kombinace musí mířit na právě jednu konfiguraci — jinak 404 (žádná)
    nebo 400 (víc než jedna, je potřeba upřesnit assessment_type_code).
    """
    stmt = select(models.CourseAssessment).where(
        models.CourseAssessment.course_id == course_id,
        models.CourseAssessment.context == context,
    )
    if module_id is not None:
        stmt = stmt.where(models.CourseAssessment.module_id == module_id)
    else:
        stmt = stmt.where(models.CourseAssessment.module_id.is_(None))
    if assessment_type_code is not None:
        stmt = stmt.where(
            models.CourseAssessment.assessment_type_code == assessment_type_code
        )

    matches = db.scalars(stmt).all()
    if not matches:
        raise HTTPException(status_code=404, detail="Konfigurace formátu nenalezena")
    if len(matches) > 1:
        raise HTTPException(
            status_code=400,
            detail="Zadání odpovídá víc konfigurací — upřesni assessment_type_code",
        )
    return matches[0]


def find_active_session(
    db: Session, user: models.User, course_assessment_id: int
) -> models.AssessmentSession | None:
    """Studentova rozjetá (ne dokončená) session na dané konfiguraci, pokud existuje."""
    return db.scalar(
        select(models.AssessmentSession).where(
            models.AssessmentSession.user_id == user.user_id,
            models.AssessmentSession.course_assessment_id == course_assessment_id,
            models.AssessmentSession.status.in_(
                [
                    AssessmentSessionStatus.in_progress,
                    AssessmentSessionStatus.awaiting_review,
                ]
            ),
            models.AssessmentSession.is_active.is_(True),
        )
    )
