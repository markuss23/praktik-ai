from fastapi import HTTPException
from types import ModuleType

from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext, AssessmentSessionStatus, Status
from api.src.common.utils import get_or_404
from api.src.assessments import closed_questions
from api.src.assessments.schemas import SessionStartResponse

CA = models.CourseAssessment
AS = models.AssessmentSession


# Kód formátu (assessment_type.code) -> modul s implementací.
# Nový formát = nová složka se stejným rozhraním (viz closed_questions/__init__.py) + řádek tady.
FORMATS: dict[str, ModuleType] = {
    "closed_questions": closed_questions,
}


def get_format(type_code: str) -> ModuleType:
    fmt = FORMATS.get(type_code)
    if fmt is None:
        raise HTTPException(
            status_code=400,
            detail=f"Interakční formát '{type_code}' nemá implementaci "
            f"(registrované: {sorted(FORMATS)})",
        )
    return fmt


def parse_settings(type_code: str, settings: dict) -> BaseModel:
    """Zvaliduje settings proti schématu formátu (doplní defaulty)."""
    try:
        return get_format(type_code).Settings.model_validate(settings)
    except ValidationError as e:
        errors = "; ".join(
            f"{'.'.join(str(loc) for loc in err['loc']) or 'settings'}: {err['msg']}"
            for err in e.errors()
        )
        raise HTTPException(
            status_code=422,
            detail=f"Neplatné nastavení formátu '{type_code}': {errors}",
        ) from e


def assert_course_editable(course: models.Course) -> None:
    if course.status != Status.edited:
        raise HTTPException(
            status_code=400,
            detail="Tuto akci lze provést pouze pokud je kurz ve stavu 'editovaný'.",
        )


def get_editable_course_assessment(
    db: Session, user: models.User, course_assessment_id: int
) -> models.CourseAssessment:
    course_assessment = get_or_404(
        db, CA, course_assessment_id, detail="Konfigurace formátu nenalezena"
    )
    validate_owner_or_superadmin(course_assessment, user, "formát")
    assert_course_editable(course_assessment.course)
    return course_assessment


def find_course_assessment(
    db: Session,
    course_id: int,
    context: AssessmentContext,
    module_id: int | None,
    assessment_type_code: str | None,
) -> models.CourseAssessment:
    """Najde aktivní konfiguraci formátu podle course_id/context(/module_id/kódu).

    `is_enabled` neřeší — vypnutý formát blokuje až `start_session`.

    Kombinace musí mířit na právě jednu konfiguraci — jinak 404 (žádná)
    nebo 400 (víc než jedna, je potřeba upřesnit assessment_type_code).
    """
    stmt = select(CA).where(
        CA.course_id == course_id,
        CA.context == context,
        CA.module_id.is_not_distinct_from(module_id),
        CA.is_active.is_(True),
    )
    if assessment_type_code is not None:
        stmt = stmt.where(CA.assessment_type_code == assessment_type_code)

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
        select(AS).where(
            AS.user_id == user.user_id,
            AS.course_assessment_id == course_assessment_id,
            AS.status.in_(
                [
                    AssessmentSessionStatus.in_progress,
                    AssessmentSessionStatus.awaiting_review,
                ]
            ),
            AS.is_active.is_(True),
        )
    )


def current_view(session: models.AssessmentSession) -> SessionStartResponse:
    """Aktuální stav rozjeté session tak, jak ho vidí student."""
    fmt = get_format(session.assessment_type_code)
    cfg = parse_settings(session.assessment_type_code, session.settings_snapshot)
    return SessionStartResponse(
        session_id=session.session_id, **fmt.view(cfg, session.result)
    )


def assert_prerequisites_passed(
    db: Session,
    user: models.User,
    course_id: int,
    module_id: int | None,
    prereq_context: AssessmentContext,
) -> None:
    """Vyhodí 403 pokud uživatel nemá 'passed' session na všech is_required
    konfiguracích v `prereq_context` (module_id=None = napříč celým kurzem).

    Gate hierarchie: practice (is_required) -> assessment; assessment (is_required) -> course_final.
    """
    stmt = select(CA.course_assessment_id).where(
        CA.course_id == course_id,
        CA.context == prereq_context,
        CA.is_required.is_(True),
        CA.is_enabled.is_(True),
        CA.is_active.is_(True),
    )
    if module_id is not None:
        stmt = stmt.where(CA.module_id == module_id)
    required_ids = set(db.scalars(stmt))
    if not required_ids:
        return

    passed_ids = set(
        db.scalars(
            select(AS.course_assessment_id).where(
                AS.user_id == user.user_id,
                AS.course_assessment_id.in_(required_ids),
                AS.status == AssessmentSessionStatus.passed,
                AS.is_active.is_(True),
            )
        )
    )
    if required_ids - passed_ids:
        raise HTTPException(
            status_code=403,
            detail="Nejdřív musíš splnit všechny povinné testy nižší úrovně.",
        )
