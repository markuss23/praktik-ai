from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.assessments.base import validate_settings
from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext
from api.src.common.utils import get_or_404
from api.src.marek_assessment.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentAttachRequest,
    CourseAssessmentResponse,
    CourseAssessmentSettingsUpdateRequest,
)


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

    course_assessment = models.CourseAssessment(
        course_id=course_id,
        module_id=body.module_id,
        assessment_type_code=body.assessment_type_code,
        context=body.context,
        settings=assessment_type.default_settings,
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
