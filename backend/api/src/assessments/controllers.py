from datetime import datetime, UTC

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext, AssessmentSessionStatus
from api.src.agents.typing_guard import typed_too_fast
from api.src.common.utils import (
    assert_course_open_for_students,
    check_enrollment,
    get_or_404,
)
from api.src.assessments.pretest.schemas import PretestSettings
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

# Kontext -> stupně, které musí být splněné (jen is_required konfigurace).
# Assessment hlídá i pretest, aby se nedal přeskočit modulem bez practice.
PREREQUISITES: dict[AssessmentContext, list[AssessmentContext]] = {
    AssessmentContext.practice: [AssessmentContext.pretest],
    AssessmentContext.assessment: [
        AssessmentContext.pretest,
        AssessmentContext.practice,
    ],
    AssessmentContext.course_final: [AssessmentContext.assessment],
}


def assert_not_pretest(course_assessment: models.CourseAssessment) -> None:
    if course_assessment.assessment_type_code == "pretest":
        raise HTTPException(
            status_code=400,
            detail="Pretest je pevně daný, upravit lze jen jeho otázky.",
        )


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

    # kontrola zda existuje assessment type
    assessment_type = get_or_404(
        db,
        models.AssessmentType,
        body.assessment_type_code,
        detail="Interakční formát nenalezen",
    )

    # kontroluje, zda je to practice / assessment / course_final
    if body.context.value not in assessment_type.allowed_contexts:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Formát '{assessment_type.name}' nelze nasadit v kontextu "
                f"'{body.context.value}' (povolené: {assessment_type.allowed_contexts})"
            ),
        )

    # Pokud je to course_final, tak nesmí být zadanej modul
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
    course_assessment = get_editable_course_assessment(db, user, course_assessment_id)
    assert_not_pretest(course_assessment)
    course_assessment.soft_delete()
    db.commit()


def update_course_assessment(
    db: Session,
    user: models.User,
    course_assessment_id: int,
    body: CourseAssessmentUpdateRequest,
) -> CourseAssessmentResponse:
    course_assessment = get_editable_course_assessment(db, user, course_assessment_id)
    assert_not_pretest(course_assessment)
    # exclude_unset: union mohl vybrat cizí formát (např. `{}` -> OpenQuestionAI),
    # jeho doplněné defaulty by pak správné schéma odmítlo
    cfg = parse_settings(
        course_assessment.assessment_type_code,
        body.settings.model_dump(exclude_unset=True),
    )
    course_assessment.settings = cfg.model_dump()
    course_assessment.is_enabled = body.is_enabled
    course_assessment.is_required = body.is_required
    db.commit()
    db.refresh(course_assessment)
    return CourseAssessmentResponse.model_validate(course_assessment)


async def start_session(
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

    # u course_final je module_id None -> prerekvizity napříč celým kurzem
    for prereq in PREREQUISITES.get(context, []):
        assert_prerequisites_passed(db, user, course_id, module_id, prereq)

    # fmt je z closed_questions __init__ ... v tom jsou vsechny funkce
    fmt = get_format(course_assessment.assessment_type_code)
    # Otázky jsou už načtené v course_assessment.settings (z find_course_assessment),
    # do DB se znovu ptát netřeba — cfg.questions je má.
    cfg = parse_settings(
        course_assessment.assessment_type_code, course_assessment.settings
    )

    # initial_state otázky nevrací — jen ověří, že nějaké jsou, a založí
    # počáteční stav běhu {"current": 0, "attempts_used": 0, "correct_count": 0}.
    # Do session se ukládá jen tento stav, otázky se nekopírují.
    session = AS(
        user_id=user.user_id,
        course_assessment_id=course_assessment.course_assessment_id,
        state=(await fmt.initial_state(db, user, course_assessment, cfg)).model_dump(),
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


async def submit_answer(
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

    fmt = get_format(session.course_assessment.assessment_type_code)

    # Psanou odpověď vzniklou nereálně rychle (vložený text) odmítneme dřív,
    # než se pokus započítá a zavolá se AI. Čas běží od startu session,
    # u dalšího pokusu od toho předchozího (každý mění state -> updated_at).
    typed = getattr(fmt, "TYPED_ANSWER", False)
    if callable(typed):
        typed = typed(fmt.State.model_validate(session.state))
    if typed and typed_too_fast(
        previous=session.state.get("last_answer", ""),
        current=answer,
        since=session.updated_at,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Odpověď vznikla rychleji, než je možné ji napsat. V testu je potřeba "
                "odpověď napsat vlastními slovy — pokus se nezapočítal."
            ),
        )

    cfg = parse_settings(
        session.course_assessment.assessment_type_code,
        session.course_assessment.settings,
    )
    # evaluate_answer posune stav: špatně a zbývají pokusy -> stejné `current`,
    # jen attempts_used + 1; správně nebo došly pokusy -> current + 1.
    outcome = await fmt.evaluate_answer(
        db,
        session.course_assessment,
        cfg,
        fmt.State.model_validate(session.state),
        answer,
    )
    # Nový stav zpět do DB — příští request si `current` načte odsud
    session.state = outcome.state.model_dump()

    if not outcome.finished:
        db.commit()
        return SessionAnswerResponse(
            session_id=session.session_id,
            is_correct=outcome.is_correct,
            finished=False,
            feedback=outcome.feedback,
            **fmt.view(cfg, outcome.state).model_dump(),
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
        feedback=outcome.feedback,
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
            assessment_type_code=session.course_assessment.assessment_type_code,
            context=session.course_assessment.context,
            module_id=session.course_assessment.module_id,
            status=session.status,
            score=session.score,
            is_passed=session.is_passed,
            started_at=session.created_at,
            finished_at=session.finished_at,
            attempts_used=session.state.get("attempts_used", 0),
        )
        for session in sessions
    ]


# ---------- Obsah pretestu (lektor) ----------


def _get_pretest(course_assessment: models.CourseAssessment) -> models.CourseAssessment:
    if course_assessment.assessment_type_code != "pretest":
        raise HTTPException(status_code=400, detail="Konfigurace není pretest.")
    return course_assessment


def get_pretest_content(
    db: Session, user: models.User, course_assessment_id: int
) -> PretestSettings:
    course_assessment = get_or_404(
        db, CA, course_assessment_id, detail="Konfigurace formátu nenalezena"
    )
    validate_owner_or_superadmin(course_assessment, user, "formát")
    _get_pretest(course_assessment)
    return parse_settings("pretest", course_assessment.settings)


def update_pretest_content(
    db: Session, user: models.User, course_assessment_id: int, body: PretestSettings
) -> PretestSettings:
    """Přepíše otázky pretestu. Struktura 2 + 1 je pevná (vynucuje PretestSettings),
    is_enabled/is_required se tudy změnit nedají."""
    course_assessment = _get_pretest(
        get_editable_course_assessment(db, user, course_assessment_id)
    )
    course_assessment.settings = body.model_dump()
    db.commit()
    return body
