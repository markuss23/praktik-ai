from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.enrollments.schemas import Enrollment, EnrollmentCreate
from api.src.enrollments.controllers import (
    list_enrollments,
    create_enrollment,
    delete_enrollment,
    soft_delete_enrollment,
)

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


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
