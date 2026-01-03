from fastapi import APIRouter

from api.src.modules.controllers import (
    create_module,
    get_modules,
    get_module,
    update_module,
    delete_module,
)
from api.src.modules.schemas import Module, ModuleCreate, ModuleUpdate
from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)

from api.database import SessionSqlSessionDependency


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


@router.post("", operation_id="create_module")
async def endp_create_module(
    module: ModuleCreate, db: SessionSqlSessionDependency
) -> Module:
    return create_module(db, module)


@router.get("/{module_id}", operation_id="get_module")
async def endp_get_module(module_id: int, db: SessionSqlSessionDependency) -> Module:
    return get_module(db, module_id)


@router.put("/{module_id}", operation_id="update_module")
async def endp_update_module(
    module_id: int, module: ModuleUpdate, db: SessionSqlSessionDependency
) -> Module:
    return update_module(db, module_id, module)


@router.delete("/{module_id}", operation_id="delete_module", status_code=204)
async def endp_delete_module(module_id: int, db: SessionSqlSessionDependency) -> None:
    delete_module(db, module_id)
