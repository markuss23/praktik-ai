from datetime import datetime, UTC

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext, AssessmentSessionStatus
from api.src.common.utils import (
    assert_course_open_for_students,
    check_enrollment,
    get_or_404,
)
from api.src.assessments.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentAttachRequest,
    CourseAssessmentResponse,
    CourseAssessmentUpdateRequest,
    SessionAnswerResponse,
    SessionHistoryItem,
    SessionStartResponse,
)
from api.src.assessments.utils import (
    assert_course_editable,
    assert_prerequisites_passed,
    current_view,
    find_active_session,
    find_course_assessment,
    get_format,
    get_editable_course_assessment,
    parse_settings,
)

CA = models.CourseAssessment
AS = models.AssessmentSession


def get_assessment_types(db: Session) -> list[AssessmentTypeResponse]:
    rows = db.scalars(
        select(models.AssessmentType)
        .where(models.AssessmentType.is_active.is_(True))
        .order_by(models.AssessmentType.code)
    ).all()
    return [AssessmentTypeResponse.model_validate(row) for row in rows]


def list_course_assessments(
    db: Session, user: models.User, course_id: int
) -> list[CourseAssessmentResponse]:
    """Připojené formáty kurzu pro lektorskou editaci — včetně vypnutých.

    Odpojené (soft-deleted) nevrací. Obsahuje `settings` se správnými
    odpověďmi, proto jen pro vlastníka kurzu / superadmina.
    """
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")

    rows = db.scalars(
        select(CA)
        .where(CA.course_id == course_id, CA.is_active.is_(True))
        # course_final (module_id NULL) jde v Postgresu u ASC na konec
        .order_by(CA.module_id, CA.context, CA.assessment_type_code)
    ).all()
    return [CourseAssessmentResponse.model_validate(row) for row in rows]


def attach_course_assessment(
    db: Session,
    user: models.User,
    course_id: int,
    body: CourseAssessmentAttachRequest,
) -> CourseAssessmentResponse:
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")
    assert_course_editable(course)

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

    course_assessment = CA(
        course_id=course_id,
        module_id=body.module_id,
        assessment_type_code=body.assessment_type_code,
        context=body.context,
        is_enabled=body.is_enabled,
        is_required=body.is_required,
        settings=assessment_type.default_settings,
    )
    db.add(course_assessment)
    db.commit()
    db.refresh(course_assessment)
    return CourseAssessmentResponse.model_validate(course_assessment)


def detach_course_assessment(
    db: Session,
    user: models.User,
    course_assessment_id: int,
) -> None:
    get_editable_course_assessment(db, user, course_assessment_id).soft_delete()
    db.commit()


def update_course_assessment(
    db: Session,
    user: models.User,
    course_assessment_id: int,
    body: CourseAssessmentUpdateRequest,
) -> CourseAssessmentResponse:
    course_assessment = get_editable_course_assessment(db, user, course_assessment_id)
    cfg = parse_settings(course_assessment.assessment_type_code, body.settings)

    course_assessment.settings = cfg.model_dump()
    course_assessment.is_enabled = body.is_enabled
    course_assessment.is_required = body.is_required
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
    check_enrollment(db, user, course_assessment.course)

    existing = find_active_session(db, user, course_assessment.course_assessment_id)
    if existing is not None:
        return current_view(existing)

    # Až za rozjetou session — nedostupný kurz ani vypnutý formát
    # neblokují dohrání rozjetého testu, jen zakládání nového.
    assert_course_open_for_students(course_assessment.course)
    if not course_assessment.is_enabled:
        raise HTTPException(status_code=403, detail="Tento test je momentálně vypnutý.")

    if context == AssessmentContext.assessment:
        assert_prerequisites_passed(
            db, user, course_id, module_id, AssessmentContext.practice
        )
    elif context == AssessmentContext.course_final:
        assert_prerequisites_passed(
            db, user, course_id, None, AssessmentContext.assessment
        )

    # Validace před insertem — nenastavený formát (prázdné otázky) nesmí
    # založit session, která by pak blokovala další pokusy.
    fmt = get_format(course_assessment.assessment_type_code)
    cfg = parse_settings(
        course_assessment.assessment_type_code, course_assessment.settings
    )

    session = AS(
        user_id=user.user_id,
        course_assessment_id=course_assessment.course_assessment_id,
        assessment_type_code=course_assessment.assessment_type_code,
        settings_snapshot=course_assessment.settings,
        result=fmt.initial_result(cfg),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return current_view(session)


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
    check_enrollment(db, user, course_assessment.course)
    session = find_active_session(db, user, course_assessment.course_assessment_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Žádná rozběhnutá session")
    return current_view(session)


def submit_answer(
    db: Session,
    user: models.User,
    session_id: int,
    answer: str,
) -> SessionAnswerResponse:
    session = db.scalar(
        select(AS).where(
            AS.session_id == session_id,
            AS.user_id == user.user_id,
            AS.is_active.is_(True),
        )
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session nenalezena")
    check_enrollment(db, user, session.course_assessment.course)

    if session.status != AssessmentSessionStatus.in_progress:
        raise HTTPException(
            status_code=409,
            detail=f"Session není rozběhnutá (aktuální stav: {session.status.value})",
        )

    fmt = get_format(session.assessment_type_code)
    cfg = parse_settings(session.assessment_type_code, session.settings_snapshot)
    outcome = fmt.evaluate_answer(cfg, session.result, answer)
    session.result = outcome.result

    if not outcome.finished:
        db.commit()
        return SessionAnswerResponse(
            session_id=session.session_id,
            is_correct=outcome.is_correct,
            finished=False,
            **fmt.view(cfg, outcome.result),
        )

    session.score = outcome.score
    session.is_passed = outcome.is_passed
    session.status = (
        AssessmentSessionStatus.passed
        if outcome.is_passed
        else AssessmentSessionStatus.failed
    )
    session.finished_at = datetime.now(UTC)
    db.commit()
    return SessionAnswerResponse(
        session_id=session.session_id,
        is_correct=outcome.is_correct,
        finished=True,
        score=outcome.score,
        is_passed=outcome.is_passed,
    )


def get_session_history(
    db: Session, user: models.User, course_id: int
) -> list[SessionHistoryItem]:
    """Všechny sessions studenta na daném kurzu, nejnovější první.

    Nefiltruje podle is_active konfigurace — i po vypnutí/smazání formátu
    lektorem si student svoji historii pokusů má vidět dál.
    """
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    check_enrollment(db, user, course)

    sessions = db.scalars(
        select(AS)
        .join(AS.course_assessment)
        .where(
            CA.course_id == course_id,
            AS.user_id == user.user_id,
            AS.is_active.is_(True),
        )
        .order_by(AS.session_id.desc())
    ).all()

    return [
        SessionHistoryItem(
            session_id=session.session_id,
            assessment_type_code=session.assessment_type_code,
            context=session.course_assessment.context,
            module_id=session.course_assessment.module_id,
            status=session.status,
            score=session.score,
            is_passed=session.is_passed,
            started_at=session.created_at,
            finished_at=session.finished_at,
        )
        for session in sessions
    ]
