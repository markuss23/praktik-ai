from datetime import datetime

from fastapi import HTTPException
from types import ModuleType

from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from api import models
from api.authorization import validate_owner_or_superadmin
from api.enums import AssessmentContext, AssessmentSessionStatus
from api.src.common.utils import assert_course_editable, get_or_404
from api.src.assessments import closed_questions
from api.src.assessments import closed_questions_ai
from api.src.assessments import open_question_ai
from api.src.assessments import pretest
from api.src.assessments import socratic_dialog_ai
from api.src.assessments.schemas import (
    AssessmentProgressItem,
    CourseProgressResponse,
    ModuleProgressItem,
    SessionStartResponse,
)

CA = models.CourseAssessment
AS = models.AssessmentSession


# Kód formátu (assessment_type.code) -> modul s implementací.
# Nový formát = nová složka se stejným rozhraním (viz closed_questions/__init__.py) + řádek tady.
FORMATS: dict[str, ModuleType] = {
    "closed_questions": closed_questions,
    "closed_questions_ai": closed_questions_ai,
    "open_question_ai": open_question_ai,
    "pretest": pretest,
    "socratic_dialog_ai": socratic_dialog_ai,
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


def abandon_active_sessions(db: Session, course_assessment_id: int) -> None:
    """Ukončí rozjeté sessions konfigurace (stav abandoned). Volá se při změně
    nebo odpojení konfigurace: session nemá snapshot settings, se starým state
    by četla nové zadání. Commit dělá volající."""
    db.execute(
        update(AS)
        .where(
            AS.course_assessment_id == course_assessment_id,
            AS.status.in_(
                [
                    AssessmentSessionStatus.in_progress,
                    AssessmentSessionStatus.awaiting_review,
                ]
            ),
            AS.is_active.is_(True),
        )
        .values(status=AssessmentSessionStatus.abandoned, finished_at=func.now())
    )


def current_view(session: models.AssessmentSession) -> SessionStartResponse:
    """Aktuální stav rozjeté session tak, jak ho vidí student.

    Zadání testu (otázky) je v course_assessment.settings, pozice studenta
    (`current` = index otázky) v session.state. `view` je spojí a vrátí
    otázku na té pozici — bez správné odpovědi. Nic neukládá, jen čte.
    """
    # Druh testu, např. "closed_questions"
    type_code: str = session.course_assessment.assessment_type_code
    # Modul formátu (closed_questions/) s funkcemi view, State, Settings...
    fmt: ModuleType = get_format(type_code)
    # Zadání z DB (dict) -> Settings objekt: cfg.questions, max_attempts, pass_threshold
    cfg: BaseModel = parse_settings(type_code, session.course_assessment.settings)
    # Pozice studenta z DB (dict) -> State objekt: current, attempts_used, correct_count
    state: BaseModel = fmt.State.model_validate(session.state)
    # cfg.questions[state.current] -> {question, options}
    view: BaseModel = fmt.view(cfg, state)
    # ** rozbalí dict do parametrů: question=..., options=...
    return SessionStartResponse(session_id=session.session_id, **view.model_dump())


def assert_prerequisites_passed(
    db: Session,
    user: models.User,
    course_id: int,
    module_id: int | None,
    prereq_context: AssessmentContext,
) -> None:
    """Vyhodí 403 pokud uživatel nemá 'passed' session na všech is_required
    konfiguracích v `prereq_context` (module_id=None = napříč celým kurzem).

    Gate hierarchie (viz PREREQUISITES v controllers.py):
    pretest -> practice -> assessment -> course_final, vždy jen is_required konfigurace.
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


def course_completion(
    db: Session, user: models.User, course: models.Course
) -> CourseProgressResponse:
    """Co má student v kurzu splněné, po jednotlivých testech.

    Bere zapnuté aktivní konfigurace kurzu; `passed` = student má na ní
    session ve stavu passed. Modul je hotový, když má splněné všechny
    povinné (pretest, povinné practice, assessment) — nepovinné jsou jen
    pro přehled. Kurz je hotový, když jsou hotové všechny aktivní moduly
    a povinný course_final, pokud je. Bez povinných konfigurací je hotovo —
    stejně jako gate v assert_prerequisites_passed.
    """
    configs = db.scalars(
        select(CA).where(
            CA.course_id == course.course_id,
            CA.is_enabled.is_(True),
            CA.is_active.is_(True),
        )
    ).all()

    # course_assessment_id -> kdy ho student splnil poprvé
    passed_at: dict[int, datetime] = dict(
        db.execute(
            select(AS.course_assessment_id, func.min(AS.finished_at))
            .where(
                AS.user_id == user.user_id,
                AS.course_assessment_id.in_(
                    [ca.course_assessment_id for ca in configs]
                ),
                AS.status == AssessmentSessionStatus.passed,
                AS.is_active.is_(True),
            )
            .group_by(AS.course_assessment_id)
        ).all()
    )

    # module_id -> testy; None = course_final. Řazení podle pořadí stupňů.
    contexts = list(AssessmentContext)
    by_module: dict[int | None, list[AssessmentProgressItem]] = {}
    for ca in sorted(
        configs, key=lambda ca: (contexts.index(ca.context), ca.assessment_type_code)
    ):
        by_module.setdefault(ca.module_id, []).append(
            AssessmentProgressItem(
                course_assessment_id=ca.course_assessment_id,
                assessment_type_code=ca.assessment_type_code,
                context=ca.context,
                is_required=ca.is_required,
                passed=ca.course_assessment_id in passed_at,
                passed_at=passed_at.get(ca.course_assessment_id),
            )
        )

    def completion(
        items: list[AssessmentProgressItem],
    ) -> tuple[bool, datetime | None]:
        """(hotovo, kdy) — kdy = splnění posledního povinného testu."""
        required = [item for item in items if item.is_required]
        if not all(item.passed for item in required):
            return False, None
        return True, max((item.passed_at for item in required), default=None)

    # course.modules vrací jen aktivní moduly
    modules = []
    for m in course.modules:
        items = by_module.get(m.module_id, [])
        completed, completed_at = completion(items)
        modules.append(
            ModuleProgressItem(
                module_id=m.module_id,
                completed=completed,
                completed_at=completed_at,
                assessments=items,
            )
        )

    course_final = by_module.get(None, [])
    final_done, final_at = completion(course_final)
    course_completed = final_done and all(m.completed for m in modules)
    done_times = [m.completed_at for m in modules] + [final_at]
    return CourseProgressResponse(
        modules=modules,
        course_final=course_final,
        course_completed=course_completed,
        course_completed_at=(
            max((t for t in done_times if t), default=None)
            if course_completed
            else None
        ),
    )
