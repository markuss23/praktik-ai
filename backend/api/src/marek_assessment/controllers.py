from datetime import datetime, timezone

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
    SessionAnswerResponse,
    SessionStartResponse,
)
from api.src.marek_assessment.base import get_format, validate_settings
from api.src.marek_assessment.utils import find_active_session, find_course_assessment


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


def start_session(
    db: Session,
    user: models.User,
    course_id: int,
    context: AssessmentContext,
    module_id: int | None,
    assessment_type_code: str | None,
) -> SessionStartResponse:
    course_assessment = find_course_assessment(
        db, course_id, context, module_id, assessment_type_code
    )
    fmt = get_format(course_assessment.assessment_type_code)

    existing = find_active_session(db, user, course_assessment.course_assessment_id)
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


def get_current_session(
    db: Session,
    user: models.User,
    course_id: int,
    context: AssessmentContext,
    module_id: int | None,
    assessment_type_code: str | None,
) -> SessionStartResponse:
    course_assessment = find_course_assessment(
        db, course_id, context, module_id, assessment_type_code
    )
    session = find_active_session(db, user, course_assessment.course_assessment_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Žádná rozběhnutá session")

    fmt = get_format(session.assessment_type_code)
    cfg = fmt["settings_schema"].model_validate(session.settings_snapshot)
    current_question = cfg.questions[session.result["current"]]

    return SessionStartResponse(
        session_id=session.session_id,
        question=current_question.question,
        options=current_question.options,
    )


def submit_answer(
    db: Session,
    user: models.User,
    session_id: int,
    answer: str,
) -> SessionAnswerResponse:
    session = db.scalar(
        select(models.AssessmentSession).where(
            models.AssessmentSession.session_id == session_id,
            models.AssessmentSession.user_id == user.user_id,
            models.AssessmentSession.is_active.is_(True),
        )
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session nenalezena")

    if session.status != AssessmentSessionStatus.in_progress:
        raise HTTPException(
            status_code=409,
            detail=f"Session není rozběhnutá (aktuální stav: {session.status.value})",
        )

    fmt = get_format(session.assessment_type_code)
    cfg = fmt["settings_schema"].model_validate(session.settings_snapshot)

    result = session.result or {}
    current = result["current"]
    attempts_used = result.get("attempts_used", 0)
    correct_count = result.get("correct_count", 0)

    question = cfg.questions[current]
    is_correct = answer.strip() == question.options[question.correct_index]
    attempts_used += 1
    attempts_exhausted = not is_correct and attempts_used >= cfg.max_attempts

    if not is_correct and not attempts_exhausted:
        session.result = {**result, "attempts_used": attempts_used}
        db.commit()
        return SessionAnswerResponse(
            session_id=session.session_id,
            is_correct=False,
            finished=False,
            question=question.question,
            options=question.options,
        )

    correct_count += int(is_correct)
    current += 1
    finished = current >= len(cfg.questions)

    if finished:
        session.status = AssessmentSessionStatus.completed
        session.score = round(correct_count / len(cfg.questions) * 100, 1)
        session.finished_at = datetime.now(timezone.utc)
        session.result = {
            **result,
            "current": current,
            "attempts_used": 0,
            "correct_count": correct_count,
        }
        db.commit()
        return SessionAnswerResponse(
            session_id=session.session_id,
            is_correct=is_correct,
            finished=True,
            score=session.score,
        )

    next_question = cfg.questions[current]
    session.result = {
        **result,
        "current": current,
        "attempts_used": 0,
        "correct_count": correct_count,
    }
    db.commit()
    return SessionAnswerResponse(
        session_id=session.session_id,
        is_correct=is_correct,
        finished=False,
        question=next_question.question,
        options=next_question.options,
    )


def get_session_history(db: Session, user: models.User, course_id: int) -> list[dict]:
    """Všechny sessions studenta na daném kurzu, nejnovější první.

    Nefiltruje podle is_active konfigurace — i po vypnutí/smazání formátu
    lektorem si student svoji historii pokusů má vidět dál.
    """
    sessions = db.scalars(
        select(models.AssessmentSession)
        .join(
            models.CourseAssessment,
            models.AssessmentSession.course_assessment_id
            == models.CourseAssessment.course_assessment_id,
        )
        .where(
            models.CourseAssessment.course_id == course_id,
            models.AssessmentSession.user_id == user.user_id,
            models.AssessmentSession.is_active.is_(True),
        )
        .order_by(models.AssessmentSession.session_id.desc())
    ).all()

    return [
        {
            "session_id": session.session_id,
            "assessment_type_code": session.assessment_type_code,
            "context": session.course_assessment.context,
            "module_id": session.course_assessment.module_id,
            "status": session.status,
            "score": session.score,
            "is_passed": session.is_passed,
            "finished_at": session.finished_at,
        }
        for session in sessions
    ]
