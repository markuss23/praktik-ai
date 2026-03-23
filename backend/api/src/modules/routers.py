from fastapi import APIRouter

from api.src.modules.controllers import (
    create_module,
    get_modules,
    get_module,
    update_module,
    complete_module,
    get_course_progress,
    get_assessment_question,
    # delete_module,
)
from api.src.modules.schemas import Module, ModuleCreate, ModuleUpdate, ModuleCompletionStatus, CompleteModuleRequest, ModuleAssessmentQuestion
from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)

from api.database import SessionSqlSessionDependency

from api.dependencies import CurrentUser, require_role

router = APIRouter(prefix="/modules", tags=["Modules"])


@router.get("", operation_id="list_modules")
async def list_modules(
    db: SessionSqlSessionDependency,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
    course_id: int | None = None,
) -> list[Module]:
    return get_modules(
        db,
        include_inactive=include_inactive,
        text_search=text_search,
        course_id=course_id,
    )


@router.post("", operation_id="create_module", dependencies=[require_role("lector")])
async def endp_create_module(
    module: ModuleCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> Module:
    return create_module(db, module, user)


@router.get("/{module_id}", operation_id="get_module")
async def endp_get_module(
    module_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> Module:
    return get_module(db, module_id, user)


@router.put("/{module_id}", operation_id="update_module", dependencies=[require_role("lector")])
async def endp_update_module(
    module_id: int, module: ModuleUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> Module:
    return update_module(db, module_id, module, user)


@router.post("/{module_id}/complete", operation_id="complete_module", dependencies=[require_role("user")])
async def endp_complete_module(
    module_id: int,
    body: CompleteModuleRequest,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> ModuleCompletionStatus:
    """Označí modul jako dokončený po úspěšném testu."""
    return complete_module(db, module_id, user, body.score)


@router.get("/course/{course_id}/progress", operation_id="get_course_progress", dependencies=[require_role("user")])
async def endp_get_course_progress(
    course_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> list[ModuleCompletionStatus]:
    """Vrátí stav dokončení všech modulů kurzu pro aktuálního uživatele."""
    return get_course_progress(db, course_id, user)


@router.get("/{module_id}/assessment", operation_id="get_module_assessment")
async def endp_get_assessment_question(
    module_id: int,
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> ModuleAssessmentQuestion:
    """Vrátí aktivní assessment otázku pro modul a aktuálního uživatele."""
    return get_assessment_question(db, module_id, user)


# @router.delete("/{module_id}", operation_id="delete_module", status_code=204)
# async def endp_delete_module(module_id: int, db: SessionSqlSessionDependency) -> None:
#     delete_module(db, module_id)
