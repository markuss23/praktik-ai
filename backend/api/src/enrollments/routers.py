from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.enrollments.schemas import (
    ActivityResponse,
    Enrollment,
    EnrollmentCreate,
    MyEnrollment,
)
from api.src.enrollments.controllers import (
    list_enrollments,
    create_enrollment,
    delete_enrollment,
    soft_delete_enrollment,
    my_enrollments,
    leave_enrollment,
    mark_module_visited,
    get_my_activity,
)

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.get("/my", operation_id="my_enrollments", dependencies=[require_role("user")])
def endp_my_enrollments(
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> list[MyEnrollment]:
    """Vrátí zápisy aktuálního uživatele s progress informacemi, next-module
    cílem a posledním časem aktivity. Seřazeno od nejnovější aktivity."""
    return my_enrollments(db, user=actor)


@router.post(
    "/my/visit/{module_id}",
    operation_id="mark_module_visited",
    status_code=204,
    dependencies=[require_role("user")],
)
def endp_mark_module_visited(
    module_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> None:
    """Označí modul jako naposledy otevřený. Slouží pro funkci „Pokračuj kde jsi
    skončil" — frontend volá při otevření stránky modulu. Tichý no-op pokud
    uživatel není v kurzu zapsán."""
    mark_module_visited(db, module_id=module_id, user=actor)


@router.get(
    "/my/activity",
    operation_id="my_activity",
    dependencies=[require_role("user")],
)
def endp_my_activity(
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
    days: Annotated[int, Query(ge=1, le=400)] = 180,
    from_date: Annotated[
        date | None,
        Query(description="Začátek rozsahu (ISO yyyy-mm-dd). Když je uveden spolu s to_date, `days` se ignoruje."),
    ] = None,
    to_date: Annotated[
        date | None,
        Query(description="Konec rozsahu (ISO yyyy-mm-dd)."),
    ] = None,
) -> ActivityResponse:
    """Vrátí denní aktivitu pro heat mapu (passed moduly, zápisy, dokončené
    kurzy). Volitelně přijímá explicitní rozsah (from_date, to_date) — pak
    se `days` ignoruje. Bez rozsahu vrací posledních `days` dnů."""
    return get_my_activity(db, user=actor, days=days, from_date=from_date, to_date=to_date)


@router.get("", operation_id="list_enrollments", dependencies=[require_role("lector")])
def endp_list_enrollments(
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
    course_id: int | None = None,
    user_id: int | None = None,
    include_inactive: bool = False,
) -> list[Enrollment]:
    """Vrátí seznam zápisů. Filtrovat lze podle kurzu (course_id) nebo uživatele (user_id)."""
    return list_enrollments(db, actor=actor, course_id=course_id, user_id=user_id, include_inactive=include_inactive)


@router.post("", operation_id="create_enrollment", dependencies=[require_role("user")])
def endp_create_enrollment(
    data: EnrollmentCreate,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> Enrollment:
    """Zapíše uživatele do kurzu. Běžný uživatel může zapsat pouze sebe."""
    return create_enrollment(db, user_id=data.user_id, course_id=data.course_id, actor=actor)


@router.delete("/{enrollment_id}/leave", operation_id="leave_enrollment", status_code=204, dependencies=[require_role("user")])
def endp_leave_enrollment(
    enrollment_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> None:
    """Uživatel se sám odepíše z kurzu."""
    leave_enrollment(db, enrollment_id=enrollment_id, user=actor)


@router.delete("/{enrollment_id}", operation_id="remove_from_course", status_code=204, dependencies=[require_role("lector")])
def endp_remove_from_course(
    enrollment_id: int,
    db: SessionSqlSessionDependency,
    actor: CurrentUser,
) -> None:
    """Odepíše uživatele z kurzu. Může pouze autor kurzu, guarantor nebo superadmin."""
    delete_enrollment(db, enrollment_id=enrollment_id, actor=actor)


@router.delete("/{enrollment_id}/delete", operation_id="delete_enrollment", status_code=204, dependencies=[require_role("superadmin")])
def endp_delete_enrollment(
    enrollment_id: int,
    db: SessionSqlSessionDependency,
) -> None:
    """Soft-delete zápisu (is_active = False). Pouze pro superadmina."""
    soft_delete_enrollment(db, enrollment_id=enrollment_id)
