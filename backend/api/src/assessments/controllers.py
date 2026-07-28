"""
Controllery interakčních formátů.

Drží sdílenou mechaniku (autorizace, lifecycle session, commit) —
o typech nic nevědí, typová logika žije v agents/assessments.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.assessments.base import get_format, validate_settings
from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext, AssessmentSessionStatus, UserRole
from api.src.assessments.schemas import (
    AssessmentTypeResponse,
    CourseAssessmentCreateRequest,
    CourseAssessmentResponse,
    CourseAssessmentUpdateRequest,
    SessionStateResponse,
    TurnInput,
)
from api.src.common.utils import check_enrollment, get_or_404

# Stavy, ve kterých session ještě „žije" (blokují start nové).
# awaiting_review se v této fázi nikdy nenastaví (žádný portovaný formát
# nemá hodnocení člověkem), ale generická mechanika s ním počítá dopředu.
_ACTIVE_STATUSES = (
    AssessmentSessionStatus.in_progress,
    AssessmentSessionStatus.awaiting_review,
)
# Terminální stavy — nastavuje se finished_at
_TERMINAL_STATUSES = (
    AssessmentSessionStatus.completed,
    AssessmentSessionStatus.passed,
    AssessmentSessionStatus.failed,
    AssessmentSessionStatus.abandoned,
)


# ---------- Katalog ----------


def list_assessment_types(db: Session) -> list[AssessmentTypeResponse]:
    rows = db.scalars(
        select(models.AssessmentType)
        .where(models.AssessmentType.is_active.is_(True))
        .order_by(models.AssessmentType.code)
    ).all()
    return [AssessmentTypeResponse.model_validate(row) for row in rows]


# ---------- Konfigurace na kurzu ----------


def list_course_assessments(
    db: Session, user: models.User, course_id: int
) -> list[CourseAssessmentResponse]:
    """Vlastník/superadmin vidí vše, zapsaný student jen zapnuté formáty."""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    is_privileged = (
        user.user_id == course.owner_id or user.role == UserRole.superadmin
    )
    if not is_privileged:
        check_enrollment(db, user, course)

    stm = (
        select(models.CourseAssessment)
        .where(
            models.CourseAssessment.course_id == course_id,
            models.CourseAssessment.is_active.is_(True),
        )
        .order_by(models.CourseAssessment.course_assessment_id)
    )
    if not is_privileged:
        stm = stm.where(models.CourseAssessment.is_enabled.is_(True))

    rows = db.scalars(stm).all()
    return [CourseAssessmentResponse.model_validate(row) for row in rows]


def create_course_assessment(
    db: Session,
    user: models.User,
    course_id: int,
    body: CourseAssessmentCreateRequest,
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

    # Koherence context × module (zrcadlí DB CHECK, ale s čitelnou hláškou)
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

    raw_settings = (
        body.settings if body.settings is not None else assessment_type.default_settings
    )
    try:
        settings = validate_settings(body.assessment_type_code, raw_settings)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    course_assessment = models.CourseAssessment(
        course_id=course_id,
        module_id=body.module_id,
        assessment_type_code=body.assessment_type_code,
        context=body.context,
        is_enabled=body.is_enabled,
        is_required=body.is_required,
        settings=settings,
    )
    db.add(course_assessment)
    db.commit()
    db.refresh(course_assessment)
    return CourseAssessmentResponse.model_validate(course_assessment)


def update_course_assessment(
    db: Session,
    user: models.User,
    course_assessment_id: int,
    body: CourseAssessmentUpdateRequest,
) -> CourseAssessmentResponse:
    course_assessment = get_or_404(
        db,
        models.CourseAssessment,
        course_assessment_id,
        detail="Konfigurace formátu nenalezena",
    )
    validate_owner_or_superadmin(course_assessment, user, "formát")

    if body.is_enabled is not None:
        course_assessment.is_enabled = body.is_enabled
    if body.is_required is not None:
        course_assessment.is_required = body.is_required
    if body.settings is not None:
        try:
            course_assessment.settings = validate_settings(
                course_assessment.assessment_type_code, body.settings
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e)) from e

    db.commit()
    db.refresh(course_assessment)
    return CourseAssessmentResponse.model_validate(course_assessment)


def delete_course_assessment(
    db: Session, user: models.User, course_assessment_id: int
) -> None:
    course_assessment = get_or_404(
        db,
        models.CourseAssessment,
        course_assessment_id,
        detail="Konfigurace formátu nenalezena",
    )
    validate_owner_or_superadmin(course_assessment, user, "formát")

    # Soft delete — rozběhnuté sessions studentů zůstávají zachované
    course_assessment.soft_delete()
    db.commit()


# ---------- Runtime (student) ----------


def _get_format(session: models.AssessmentSession) -> dict:
    """Najde v registru dict formátu ({settings_schema, start, handle_turn, current_view})."""
    try:
        return get_format(session.assessment_type_code)
    except ValueError as e:
        # Formát je v katalogu, ale chybí implementace — chyba konfigurace serveru
        raise HTTPException(status_code=500, detail=str(e)) from e


def _session_state(session: models.AssessmentSession, fmt: dict) -> SessionStateResponse:
    return SessionStateResponse(
        session_id=session.session_id,
        status=session.status,
        view=fmt["current_view"](session),
    )


def _apply_turn_result(session: models.AssessmentSession, status) -> None:
    session.status = status
    if status in _TERMINAL_STATUSES and session.finished_at is None:
        session.finished_at = datetime.now(timezone.utc)


def _get_runnable_course_assessment(
    db: Session, user: models.User, course_assessment_id: int
) -> models.CourseAssessment:
    """Načte konfiguraci a ověří, že ji student smí spustit."""
    course_assessment = get_or_404(
        db,
        models.CourseAssessment,
        course_assessment_id,
        detail="Konfigurace formátu nenalezena",
    )
    if not course_assessment.is_enabled:
        raise HTTPException(status_code=400, detail="Formát není na kurzu zapnutý")

    course = course_assessment.course
    if not (course.is_active and course.status in ("approved", "archived")):
        raise HTTPException(status_code=400, detail="Kurz není aktivní a schválený")

    # Vlastník a superadmin mohou testovat bez zápisu
    check_enrollment(db, user, course, bypass_for_owner=True)
    return course_assessment


def _find_active_session(
    db: Session, user: models.User, course_assessment_id: int
) -> models.AssessmentSession | None:
    return db.scalars(
        select(models.AssessmentSession).where(
            models.AssessmentSession.user_id == user.user_id,
            models.AssessmentSession.course_assessment_id == course_assessment_id,
            models.AssessmentSession.is_active.is_(True),
            models.AssessmentSession.status.in_(_ACTIVE_STATUSES),
        )
    ).first()


def start_session(
    db: Session, user: models.User, course_assessment_id: int
) -> SessionStateResponse:
    course_assessment = _get_runnable_course_assessment(db, user, course_assessment_id)

    # Idempotence: existující rozběhnutá session se vrací místo chyby
    existing = _find_active_session(db, user, course_assessment_id)
    if existing is not None:
        return _session_state(existing, _get_format(existing))

    session = models.AssessmentSession(
        user_id=user.user_id,
        course_assessment_id=course_assessment.course_assessment_id,
        assessment_type_code=course_assessment.assessment_type_code,
        settings_snapshot=course_assessment.settings,
    )
    db.add(session)
    db.flush()  # session_id pro tahy

    fmt = _get_format(session)
    try:
        result = fmt["start"](db, session)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e

    _apply_turn_result(session, result.status)
    db.commit()

    return SessionStateResponse(
        session_id=session.session_id, status=session.status, view=result.view
    )


def _get_own_session(
    db: Session, user: models.User, session_id: int
) -> models.AssessmentSession:
    session = db.scalars(
        select(models.AssessmentSession).where(
            models.AssessmentSession.session_id == session_id,
            models.AssessmentSession.user_id == user.user_id,
            models.AssessmentSession.is_active.is_(True),
        )
    ).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session nenalezena")
    return session


def submit_turn(
    db: Session, user: models.User, session_id: int, body: TurnInput
) -> SessionStateResponse:
    session = _get_own_session(db, user, session_id)

    if session.status != AssessmentSessionStatus.in_progress:
        raise HTTPException(
            status_code=409,
            detail=f"Session není rozběhnutá (aktuální stav: {session.status.value})",
        )

    fmt = _get_format(session)
    try:
        result = fmt["handle_turn"](db, session, body)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e

    _apply_turn_result(session, result.status)
    db.commit()

    return SessionStateResponse(
        session_id=session.session_id, status=session.status, view=result.view
    )


def get_session_state(
    db: Session, user: models.User, session_id: int
) -> SessionStateResponse:
    session = _get_own_session(db, user, session_id)
    return _session_state(session, _get_format(session))


def get_current_session(
    db: Session, user: models.User, course_assessment_id: int
) -> SessionStateResponse:
    """Rozběhnutá session přihlášeného studenta — pro obnovu UI po refreshi."""
    session = _find_active_session(db, user, course_assessment_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Žádná rozběhnutá session")
    return _session_state(session, _get_format(session))
