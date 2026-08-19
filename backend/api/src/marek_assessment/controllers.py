from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext, AssessmentSessionStatus
from api.src.common.utils import get_or_404
from api.src.marek_assessment.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentAttachRequest,
    CourseAssessmentResponse,
    CourseAssessmentSettingsUpdateRequest,
    SessionStartResponse,
)
from api.src.marek_assessment.base import get_format, validate_settings


def get_assessment_types(db: Session) -> list[AssessmentTypeResponse]:
    rows = db.scalars(
        select(models.AssessmentType)
        .where(models.AssessmentType.is_active.is_(True))
        .order_by(models.AssessmentType.code)
    ).all()
    return [AssessmentTypeResponse.model_validate(row) for row in rows]


def attach_course_assessment(
    db: Session,
    user: models.User,
    course_id: int,
    body: CourseAssessmentAttachRequest,
) -> CourseAssessmentResponse:
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")

    assessment_type = get_or_404(
        db,
        models.AssessmentType,
        body.assessment_type_code,
        detail="Interakční formát nenalezen",
    )

    if body.context.value not in assessment_type.allowed_contexts:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Formát '{assessment_type.name}' nelze nasadit v kontextu "
                f"'{body.context.value}' (povolené: {assessment_type.allowed_contexts})"
            ),
        )

    if body.context == AssessmentContext.course_final:
        if body.module_id is not None:
            raise HTTPException(
                status_code=400,
                detail="course_final se váže na kurz — module_id musí být prázdné",
            )
    else:
        if body.module_id is None:
            raise HTTPException(
                status_code=400,
                detail=f"Kontext '{body.context.value}' vyžaduje module_id",
            )
        module = get_or_404(db, models.Module, body.module_id, detail="Modul nenalezen")
        if module.course_id != course_id:
            raise HTTPException(status_code=400, detail="Modul nepatří do tohoto kurzu")

    try:
        settings = validate_settings(
            body.assessment_type_code, assessment_type.default_settings
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    course_assessment = models.CourseAssessment(
        course_id=course_id,
        module_id=body.module_id,
        assessment_type_code=body.assessment_type_code,
        context=body.context,
        settings=settings,
    )
    db.add(course_assessment)
    db.commit()
    db.refresh(course_assessment)
    return CourseAssessmentResponse.model_validate(course_assessment)


def update_course_assessment_settings(
    db: Session,
    user: models.User,
    course_assessment_id: int,
    body: CourseAssessmentSettingsUpdateRequest,
) -> CourseAssessmentResponse:
    course_assessment = get_or_404(
        db,
        models.CourseAssessment,
        course_assessment_id,
        detail="Konfigurace formátu nenalezena",
    )
    validate_owner_or_superadmin(course_assessment, user, "formát")

    try:
        settings = validate_settings(
            course_assessment.assessment_type_code, body.settings
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    course_assessment.settings = settings
    db.commit()
    db.refresh(course_assessment)
    return CourseAssessmentResponse.model_validate(course_assessment)


def start_session(
    db: Session,
    user: models.User,
    course_id: int,
    context: AssessmentContext,
    module_id: int | None,
    assessment_type_code: str | None,
) -> SessionStartResponse:
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
    course_assessment = matches[0]

    fmt = get_format(course_assessment.assessment_type_code)

    existing = db.scalar(
        select(models.AssessmentSession).where(
            models.AssessmentSession.user_id == user.user_id,
            models.AssessmentSession.course_assessment_id
            == course_assessment.course_assessment_id,
            models.AssessmentSession.status.in_(
                [AssessmentSessionStatus.in_progress, AssessmentSessionStatus.awaiting_review]
            ),
            models.AssessmentSession.is_active.is_(True),
        )
    )
    if existing is not None:
        existing_cfg = fmt["settings_schema"].model_validate(existing.settings_snapshot)
        current_question = existing_cfg.questions[existing.result["current"]]
        return SessionStartResponse(
            session_id=existing.session_id,
            question=current_question.question,
            options=current_question.options,
        )

    cfg = fmt["settings_schema"].model_validate(course_assessment.settings)
    first_question = cfg.questions[0]

    session = models.AssessmentSession(
        user_id=user.user_id,
        course_assessment_id=course_assessment.course_assessment_id,
        assessment_type_code=course_assessment.assessment_type_code,
        settings_snapshot=course_assessment.settings,
        result={"current": 0},
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return SessionStartResponse(
        session_id=session.session_id,
        question=first_question.question,
        options=first_question.options,
    )
