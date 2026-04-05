from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, and_, func, select
from sqlalchemy.orm import Session

from api.src.common.utils import get_or_404, assert_course_editable, check_enrollment
from api.src.modules.schemas import Module, ModuleCreate, ModuleUpdate, ModuleCompletionStatus, ModuleAssessmentQuestion
from api import enums, models
from api.authorization import validate_owner_or_superadmin


def get_modules(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    course_id: int | None = None,
) -> list[Module]:
    """
    Vrátí seznam modulů s volitelnými filtry:
    - include_inactive: zahrnout i neaktivní (jinak jen aktivní)
    - text_search: fulltext přes title
    - course_id: moduly jen pro daný kurz
    """
    stm: Select[tuple[models.Module]] = select(models.Module)

    if not include_inactive:
        stm = stm.where(models.Module.is_active.is_(True))

    if course_id is not None:
        stm = stm.where(models.Module.course_id == course_id)

    if text_search:
        stm = stm.where(models.Module.title.ilike(f"%{text_search}%"))

    stm = stm.order_by(models.Module.course_id, models.Module.module_id)

    rows: Sequence[models.Module] = db.execute(stm).scalars().all()
    return [Module.model_validate(m) for m in rows]


def create_module(db: Session, data: ModuleCreate, user: models.User) -> Module:
    """
    Vytvoří modul.
    """
    course = get_or_404(db, models.Course, data.course_id, detail="Kurz neexistuje.", check_active=False)

    # Validace vlastnictví kurzu
    validate_owner_or_superadmin(course, user, "modul")

    obj = models.Module(**data.model_dump())
    obj.is_active = True

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return Module.model_validate(obj)


def get_module(db: Session, module_id: int, user: models.User) -> Module:
    """
    Vrátí konkrétní modul podle module_id
    """
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen", check_active=False)
    return Module.model_validate(module)


def update_module(db: Session, module_id: int, module_data: ModuleUpdate, user: models.User) -> Module:
    """
    Upraví data modulu s module_id podle dat v module_data.
    Pokud se mění pozice, automaticky přehodní pozice ostatních modulů.
    """
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")

    # Validace vlastnictví
    validate_owner_or_superadmin(module, user, "modul")

    # kontrola, zda je kurz v editovatelném stavu
    assert_course_editable(module.course)

    # kontrola unikátnosti názvu (pokud se mění)
    if module_data.title != module.title:
        title_exists_stm: Select[tuple[models.Module]] = select(models.Module).where(
            and_(
                models.Module.course_id == module.course_id,
                models.Module.title == module_data.title,
                models.Module.is_active.is_(True),
                models.Module.module_id != module_id,
            )
        )
        if db.execute(title_exists_stm).first() is not None:
            raise HTTPException(
                status_code=400,
                detail="Modul s tímto názvem pro daný kurz již existuje.",
            )

    module.title = module_data.title
    module.max_task_attempts = module_data.max_task_attempts
    db.add(module)
    db.commit()
    db.refresh(module)

    return Module.model_validate(module)


def delete_module(db: Session, module_id: int) -> None:
    """
    Smaže modul podle module_id (soft delete - nastaví is_active=False)
    """
    module = get_or_404(db, models.Module, module_id, detail="Module not found", check_active=False)

    # Soft delete - nastavíme is_active na False
    module.is_active = False
    db.commit()


def complete_module(db: Session, module_id: int, user: models.User, score: int) -> ModuleCompletionStatus:
    """
    Označí modul jako dokončený (passed) pro daného uživatele.
    Vyžaduje, aby uživatel byl zapsán v kurzu a předchozí moduly byly dokončeny.
    """
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")

    course = module.course
    if not course or not course.is_active:
        raise HTTPException(status_code=404, detail="Kurz nenalezen")

    # Check enrollment (owner/superadmin bypass)
    check_enrollment(db, user, course, bypass_for_owner=True)

    # Check if already passed
    existing = db.scalar(
        select(models.ModuleTaskSession).where(
            models.ModuleTaskSession.user_id == user.user_id,
            models.ModuleTaskSession.module_id == module_id,
            models.ModuleTaskSession.status == enums.ModuleTaskSessionStatus.passed,
        )
    )
    if existing:
        return ModuleCompletionStatus(module_id=module_id, passed=True, score=score)

    # Create task session as passed
    session = models.ModuleTaskSession(
        user_id=user.user_id,
        module_id=module_id,
        status=enums.ModuleTaskSessionStatus.passed,
        generated_task=f"Practice test score: {score}%",
    )
    db.add(session)
    db.flush()

    # Check if ALL active modules are now passed → mark enrollment as completed
    all_passed = True
    for m in [m for m in course.modules if m.is_active]:
        if m.module_id == module_id:
            continue  # just completed this one
        m_passed = db.scalar(
            select(models.ModuleTaskSession).where(
                models.ModuleTaskSession.user_id == user.user_id,
                models.ModuleTaskSession.module_id == m.module_id,
                models.ModuleTaskSession.status == enums.ModuleTaskSessionStatus.passed,
            )
        )
        if m_passed is None:
            all_passed = False
            break

    if all_passed:
        enrollment_obj = db.scalar(
            select(models.Enrollment).where(
                models.Enrollment.user_id == user.user_id,
                models.Enrollment.course_id == course.course_id,
                models.Enrollment.is_active.is_(True),
                models.Enrollment.left_at.is_(None),
            )
        )
        if enrollment_obj and enrollment_obj.completed_at is None:
            enrollment_obj.completed_at = func.now()

    db.commit()

    return ModuleCompletionStatus(module_id=module_id, passed=True, score=score, course_completed=all_passed)


def get_assessment_question(db: Session, module_id: int, user: models.User) -> ModuleAssessmentQuestion:
    """Vrátí assessment otázku pro daný modul a uživatele. Priorita: in_progress > passed > nejnovější failed."""
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")

    # Priorita: in_progress nebo passed (max 1 díky unique indexu), pak nejnovější failed
    session = db.scalar(
        select(models.ModuleTaskSession).where(
            models.ModuleTaskSession.user_id == user.user_id,
            models.ModuleTaskSession.module_id == module_id,
            models.ModuleTaskSession.status.in_([
                enums.ModuleTaskSessionStatus.in_progress,
                enums.ModuleTaskSessionStatus.passed,
            ]),
        )
    )

    if session is None:
        session = db.scalar(
            select(models.ModuleTaskSession)
            .where(
                models.ModuleTaskSession.user_id == user.user_id,
                models.ModuleTaskSession.module_id == module_id,
                models.ModuleTaskSession.status == enums.ModuleTaskSessionStatus.failed,
            )
            .order_by(models.ModuleTaskSession.session_id.desc())
        )

    if session is None:
        raise HTTPException(status_code=404, detail="Žádná assessment otázka pro tento modul")

    return ModuleAssessmentQuestion(
        session_id=session.session_id,
        generated_task=session.generated_task,
        status=session.status.value,
    )


def get_course_progress(db: Session, course_id: int, user: models.User) -> list[ModuleCompletionStatus]:
    """Vrátí stav dokončení všech modulů kurzu pro daného uživatele."""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    result: list[ModuleCompletionStatus] = []
    for module in course.modules:
        if not module.is_active:
            continue

        # Najdi relevantní task session: priorita passed > in_progress > nejnovější failed
        session = db.scalar(
            select(models.ModuleTaskSession).where(
                models.ModuleTaskSession.user_id == user.user_id,
                models.ModuleTaskSession.module_id == module.module_id,
                models.ModuleTaskSession.status.in_([
                    enums.ModuleTaskSessionStatus.passed,
                    enums.ModuleTaskSessionStatus.in_progress,
                ]),
            )
        )
        if session is None:
            session = db.scalar(
                select(models.ModuleTaskSession)
                .where(
                    models.ModuleTaskSession.user_id == user.user_id,
                    models.ModuleTaskSession.module_id == module.module_id,
                    models.ModuleTaskSession.status == enums.ModuleTaskSessionStatus.failed,
                )
                .order_by(models.ModuleTaskSession.session_id.desc())
            )

        task_session_status: str | None = None
        attempts_used = 0
        if session is not None:
            task_session_status = session.status.value
            attempts_used = db.scalar(
                select(func.count()).where(
                    models.TaskAttempt.session_id == session.session_id,
                    models.TaskAttempt.status == enums.AttemptStatus.evaluated,
                )
            ) or 0

        result.append(ModuleCompletionStatus(
            module_id=module.module_id,
            passed=task_session_status == enums.ModuleTaskSessionStatus.passed,
            task_session_status=task_session_status,
            attempts_used=attempts_used,
            max_attempts=module.max_task_attempts,
            passing_score=module.passing_score,
        ))
    return result
