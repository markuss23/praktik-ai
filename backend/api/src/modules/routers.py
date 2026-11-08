from fastapi import APIRouter, Response

from api.src.modules.controllers import (
    create_module,
    get_modules,
    get_module,
    update_module,
    delete_module,
    get_module_podcast,
)
from api.src.modules.schemas import Module, ModuleCreate, ModuleUpdate
from api.src.common.annotations import (
    INCLUDE_INACTIVE_ANNOTATION,
    TEXT_SEARCH_ANNOTATION,
)

from api.database import SessionSqlSessionDependency

from api.dependencies import CurrentUser, is_staff, require_role
from api.src.common.utils import ensure_course_visible

router = APIRouter(prefix="/modules", tags=["Modules"])


@router.get("", operation_id="list_modules")
async def list_modules(
    db: SessionSqlSessionDependency,
    user: CurrentUser,
    include_inactive: INCLUDE_INACTIVE_ANNOTATION = False,
    text_search: TEXT_SEARCH_ANNOTATION = None,
    course_id: int | None = None,
) -> list[Module]:
    # Student smí jen moduly kurzu, který vidí (publikovaný nebo kam je zapsaný);
    # bez course_id dostane jen moduly publikovaných kurzů.
    published_only = False
    if not is_staff(user):
        include_inactive = False
        if course_id is not None:
            ensure_course_visible(db, course_id, user)
        else:
            published_only = True
    return get_modules(
        db,
        include_inactive=include_inactive,
        text_search=text_search,
        course_id=course_id,
        published_only=published_only,
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


@router.get("/{module_id}/podcast", operation_id="get_module_podcast")
async def endp_get_module_podcast(
    module_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> Response:
    """MP3 podcastu modulu ke stažení (`<název modulu>.mp3`). 404, když modul podcast nemá."""
    return get_module_podcast(db, module_id, user)


@router.put("/{module_id}", operation_id="update_module", dependencies=[require_role("lector")])
async def endp_update_module(
    module_id: int, module: ModuleUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> Module:
    return update_module(db, module_id, module, user)


@router.delete(
    "/{module_id}", operation_id="delete_module", status_code=204, dependencies=[require_role("lector")]
)
async def endp_delete_module(module_id: int, db: SessionSqlSessionDependency, user: CurrentUser) -> None:
    delete_module(db, module_id, user)
