from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.src.common.utils import get_or_404
from api.enums import Status, UserRole, ModuleTaskSessionStatus
from api.src.enrollments.schemas import (
    ActivityDay,
    ActivityResponse,
    Enrollment,
    MyEnrollment,
    MyEnrollmentCourse,
    MyEnrollmentNextModule,
)


def list_enrollments(
    db: Session,
    actor: models.User,
    course_id: int | None = None,
    user_id: int | None = None,
    include_inactive: bool = False,
) -> list[Enrollment]:
    """
    Vrátí seznam zápisů, volitelně filtrovaný podle kurzu nebo uživatele.
    Endpoint zamčený přes require_role("lector").
    include_inactive je povoleno pouze pro superadmina.
    """
    stm = select(models.Enrollment).order_by(models.Enrollment.enrollment_id)

    if include_inactive and actor.role != UserRole.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Pouze superadmin může zobrazit neaktivní zápisy",
        )

    if not include_inactive:
        stm = stm.where(models.Enrollment.is_active.is_(True))

    if course_id is not None:
        stm = stm.where(models.Enrollment.course_id == course_id)
    if user_id is not None:
        stm = stm.where(models.Enrollment.user_id == user_id)
    rows = db.execute(stm).scalars().all()
    return [Enrollment.model_validate(e) for e in rows]


def create_enrollment(
    db: Session,
    user_id: int,
    course_id: int,
    actor: models.User,
) -> Enrollment:
    """
    Zapíše uživatele do kurzu.
    Běžný uživatel může zapsat pouze sebe.
    Admin/superadmin může zapsat kohokoliv.
    """
    # Regular users can only enroll themselves; admin/superadmin can enroll anyone
    if actor.role not in (UserRole.guarantor, UserRole.superadmin) and actor.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Můžete zapsat pouze sami sebe",
        )

    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")

    if not course.is_published or course.status != Status.approved:
        raise HTTPException(
            status_code=400,
            detail="Kurz není publikovaný nebo schválený, nelze se zapsat",
        )

    get_or_404(db, models.User, user_id, detail="Uživatel nenalezen")

    existing = db.scalar(
        select(models.Enrollment).where(
            models.Enrollment.user_id == user_id,
            models.Enrollment.course_id == course_id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Uživatel je již zapsán do tohoto kurzu")

    enrollment = models.Enrollment(user_id=user_id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return Enrollment.model_validate(enrollment)


def delete_enrollment(
    db: Session,
    enrollment_id: int,
    actor: models.User,
) -> None:
    """
    Vyřadí uživatele z kurzu (nastaví left_at).
    Endpoint je zamčený přes require_role("lector").
    """
    enrollment = get_or_404(db, models.Enrollment, enrollment_id, detail="Zápis nenalezen", check_active=False)

    if enrollment.left_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Uživatel byl již z kurzu vyřazen",
        )

    enrollment.left_at = func.now()
    db.commit()


def soft_delete_enrollment(
    db: Session,
    enrollment_id: int,
) -> None:
    """
    Soft-delete zápisu (is_active = False).
    Endpoint zamčený přes require_role("superadmin").
    """
    enrollment = get_or_404(db, models.Enrollment, enrollment_id, detail="Zápis nenalezen", check_active=False)

    if not enrollment.is_active:
        raise HTTPException(
            status_code=400,
            detail="Zápis je již deaktivovaný",
        )

    enrollment.is_active = False
    db.commit()


def my_enrollments(db: Session, user: models.User) -> list[MyEnrollment]:
    """
    Vrátí zápisy aktuálního uživatele s progress informacemi.

    Implementováno bez N+1 — všechny moduly a passed task sessions jsou
    načteny v jediném SQL dotazu na uživatele, nikoli per-kurz.
    """
    enrollments: list[models.Enrollment] = list(
        db.execute(
            select(models.Enrollment)
            .options(joinedload(models.Enrollment.course))
            .where(
                models.Enrollment.user_id == user.user_id,
                models.Enrollment.is_active.is_(True),
                models.Enrollment.left_at.is_(None),
            )
        ).scalars()
    )

    if not enrollments:
        return []

    course_ids = [e.course_id for e in enrollments if e.course and e.course.is_active]
    if not course_ids:
        return []

    # Načti všechny aktivní moduly relevantních kurzů jedním dotazem.
    # Course.modules má custom primaryjoin s is_active==True, takže pro
    # předvídatelné chování v rámci dávky raději vlastní explicit query.
    modules_by_course: dict[int, list[models.Module]] = {}
    for m in db.execute(
        select(models.Module)
        .where(
            models.Module.course_id.in_(course_ids),
            models.Module.is_active.is_(True),
        )
        .order_by(models.Module.course_id, models.Module.module_id)
    ).scalars():
        modules_by_course.setdefault(m.course_id, []).append(m)

    # Jedním dotazem stáhneme všechny passed (module_id) pro daného uživatele
    # napříč jeho zápisy.
    passed_rows = db.execute(
        select(models.ModuleTaskSession.module_id)
        .join(models.Module, models.Module.module_id == models.ModuleTaskSession.module_id)
        .where(
            models.ModuleTaskSession.user_id == user.user_id,
            models.ModuleTaskSession.status == ModuleTaskSessionStatus.passed,
            models.Module.course_id.in_(course_ids),
        )
    ).all()
    passed_module_ids: set[int] = {row[0] for row in passed_rows}

    # Druhým dotazem agregujeme nejnovější timestamp aktivity pro každý
    # (user_id, course_id) — bere v úvahu i activity před zavedením
    # `last_activity_at` (legacy fallback).
    legacy_activity_rows = db.execute(
        select(
            models.Module.course_id,
            func.max(models.ModuleTaskSession.updated_at),
        )
        .join(models.Module, models.Module.module_id == models.ModuleTaskSession.module_id)
        .where(
            models.ModuleTaskSession.user_id == user.user_id,
            models.Module.course_id.in_(course_ids),
        )
        .group_by(models.Module.course_id)
    ).all()
    legacy_activity: dict[int, datetime] = {row[0]: row[1] for row in legacy_activity_rows}

    result: list[MyEnrollment] = []
    for enrollment in enrollments:
        course = enrollment.course
        if not course or not course.is_active:
            continue

        active_modules = modules_by_course.get(course.course_id, [])
        total_modules = len(active_modules)

        passed_count = sum(1 for m in active_modules if m.module_id in passed_module_ids)

        # next_module: první neudělaný modul. Když je vše hotovo → None.
        next_module: MyEnrollmentNextModule | None = None
        for idx, m in enumerate(active_modules):
            if m.module_id not in passed_module_ids:
                next_module = MyEnrollmentNextModule(
                    module_id=m.module_id,
                    title=m.title,
                    index=idx + 1,
                    total=total_modules,
                )
                break

        # Pokud uživatel má explicitní last_visited, použij ho; jinak
        # spadni na agregovaný timestamp ze task_session (backfill pro
        # existující uživatele před zavedením explicitního trackingu).
        last_activity = enrollment.last_activity_at or legacy_activity.get(course.course_id)

        result.append(MyEnrollment(
            enrollment_id=enrollment.enrollment_id,
            course_id=course.course_id,
            course=MyEnrollmentCourse(
                course_id=course.course_id,
                title=course.title,
                description=course.description,
                modules_count=total_modules,
            ),
            completed_modules=passed_count,
            total_modules=total_modules,
            enrolled_at=enrollment.created_at,
            completed_at=enrollment.completed_at,
            next_module=next_module,
            last_visited_module_id=enrollment.last_visited_module_id,
            last_activity_at=last_activity,
        ))

    # Seřaď podle reálné aktivity — frontend tak může vybrat resume kurz
    # bez vlastní heuristiky.
    result.sort(
        key=lambda e: (e.last_activity_at or e.enrolled_at),
        reverse=True,
    )
    return result


def leave_enrollment(db: Session, enrollment_id: int, user: models.User) -> None:
    """Uživatel se sám odepíše z kurzu."""
    enrollment = get_or_404(db, models.Enrollment, enrollment_id, detail="Zápis nenalezen", check_active=False)

    if enrollment.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Můžete opustit pouze vlastní zápis")

    if enrollment.left_at is not None:
        raise HTTPException(status_code=400, detail="Kurz jste již opustili")

    enrollment.left_at = func.now()
    db.commit()


def mark_module_visited(db: Session, module_id: int, user: models.User) -> None:
    """
    Označí modul jako naposledy otevřený daným uživatelem.
    Updatuje `last_visited_module_id` a `last_activity_at` na enrollmentu
    odpovídajícím kurzu, jehož je modul součástí.

    Tichý no-op, pokud user není zapsán nebo modul/kurz neexistuje —
    endpoint slouží pro tracking, ne pro authorization.
    """
    module = db.scalar(
        select(models.Module).where(models.Module.module_id == module_id)
    )
    if module is None or not module.is_active:
        return

    enrollment = db.scalar(
        select(models.Enrollment).where(
            models.Enrollment.user_id == user.user_id,
            models.Enrollment.course_id == module.course_id,
            models.Enrollment.is_active.is_(True),
            models.Enrollment.left_at.is_(None),
        )
    )
    if enrollment is None:
        return

    enrollment.last_visited_module_id = module_id
    enrollment.last_activity_at = datetime.now(tz=UTC)
    db.commit()


# Maximum rozsahu jednoho dotazu — chrání před zneužitím a držíme dotaz lehký
_MAX_ACTIVITY_DAYS = 400  # rok + drobná rezerva (např. zarovnání týdnů)
_DEFAULT_ACTIVITY_DAYS = 180


def get_my_activity(
    db: Session,
    user: models.User,
    days: int = _DEFAULT_ACTIVITY_DAYS,
    from_date: date | None = None,
    to_date: date | None = None,
) -> ActivityResponse:
    """
    Vrátí denní aktivitu uživatele pro heat mapu.

    Pokud jsou předány `from_date` + `to_date`, použije se přímo ten rozsah
    (např. konkrétní rok nebo měsíc). Jinak fallback na "posledních `days` dnů"
    od dneška.

    Aktivita = úspěšně dokončené (passed) task sessions + zapsání do kurzu +
    dokončení kurzu. Vše agregováno per den v UTC.
    """
    if from_date is not None and to_date is not None:
        if from_date > to_date:
            from_date, to_date = to_date, from_date
        span = (to_date - from_date).days + 1
        if span > _MAX_ACTIVITY_DAYS:
            # Ořízni rozsah na maximum, počítáno zpětně od to_date
            from_date = to_date - timedelta(days=_MAX_ACTIVITY_DAYS - 1)
    else:
        days = max(1, min(days, _MAX_ACTIVITY_DAYS))
        to_date = datetime.now(tz=UTC).date()
        from_date = to_date - timedelta(days=days - 1)

    from_dt = datetime.combine(from_date, datetime.min.time(), tzinfo=UTC)
    to_dt = datetime.combine(to_date, datetime.max.time(), tzinfo=UTC)

    bucket: dict[date, dict[str, object]] = defaultdict(
        lambda: {"count": 0, "titles": []}
    )

    # Passed task sessions (užitečnější granularita než completed_at zápisu)
    passed_rows = db.execute(
        select(
            func.date_trunc("day", models.ModuleTaskSession.updated_at).label("d"),
            models.Module.title,
            models.Course.title,
        )
        .join(models.Module, models.Module.module_id == models.ModuleTaskSession.module_id)
        .join(models.Course, models.Course.course_id == models.Module.course_id)
        .where(
            models.ModuleTaskSession.user_id == user.user_id,
            models.ModuleTaskSession.status == ModuleTaskSessionStatus.passed,
            models.ModuleTaskSession.updated_at >= from_dt,
            models.ModuleTaskSession.updated_at <= to_dt,
        )
    ).all()
    for d, mod_title, course_title in passed_rows:
        day = d.date()
        entry = bucket[day]
        entry["count"] = int(entry["count"]) + 1  # type: ignore[arg-type]
        titles = entry["titles"]
        if isinstance(titles, list) and len(titles) < 3:
            titles.append(f"✅ {course_title}: {mod_title}")

    # Enrollment created (zápis do kurzu) — jedno započítané "události" denně
    enrolled_rows = db.execute(
        select(
            func.date_trunc("day", models.Enrollment.created_at).label("d"),
            models.Course.title,
        )
        .join(models.Course, models.Course.course_id == models.Enrollment.course_id)
        .where(
            models.Enrollment.user_id == user.user_id,
            models.Enrollment.created_at >= from_dt,
            models.Enrollment.created_at <= to_dt,
        )
    ).all()
    for d, course_title in enrolled_rows:
        day = d.date()
        entry = bucket[day]
        entry["count"] = int(entry["count"]) + 1  # type: ignore[arg-type]
        titles = entry["titles"]
        if isinstance(titles, list) and len(titles) < 3:
            titles.append(f"📚 Zápis: {course_title}")

    # Enrollment completed (celý kurz hotov)
    completed_rows = db.execute(
        select(
            func.date_trunc("day", models.Enrollment.completed_at).label("d"),
            models.Course.title,
        )
        .join(models.Course, models.Course.course_id == models.Enrollment.course_id)
        .where(
            models.Enrollment.user_id == user.user_id,
            models.Enrollment.completed_at.is_not(None),
            models.Enrollment.completed_at >= from_dt,
            models.Enrollment.completed_at <= to_dt,
        )
    ).all()
    for d, course_title in completed_rows:
        day = d.date()
        entry = bucket[day]
        entry["count"] = int(entry["count"]) + 1  # type: ignore[arg-type]
        titles = entry["titles"]
        if isinstance(titles, list) and len(titles) < 3:
            titles.append(f"🏆 Dokončen: {course_title}")

    days_out = [
        ActivityDay(
            date=day,
            count=int(entry["count"]),  # type: ignore[arg-type]
            titles=list(entry["titles"]),  # type: ignore[arg-type]
        )
        for day, entry in sorted(bucket.items())
    ]

    return ActivityResponse(days=days_out, from_date=from_date, to_date=to_date)
