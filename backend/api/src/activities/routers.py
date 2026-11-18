from fastapi import APIRouter
from api.dependencies import CurrentUser
from api.src.activities.controllers import (
    create_learn_block,
    update_learn_block,
    delete_learn_block,
)
from api.src.activities.schemas import (
    LearnBlock,
    LearnBlockCreate,
    LearnBlockUpdate,
)

from api.database import SessionSqlSessionDependency
from api.dependencies import require_role

router = APIRouter(prefix="/activities", tags=["Activities"], dependencies=[require_role("lector")])


# ---------- LearnBlock ----------


@router.post("/learn-blocks", operation_id="create_learn_block")
async def endp_create_learn_block(
    learn_block: LearnBlockCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> LearnBlock:
    return create_learn_block(db, learn_block, user)


@router.put("/learn-blocks/{learn_id}", operation_id="update_learn_block")
async def endp_update_learn_block(
    learn_id: int, learn_block: LearnBlockUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> LearnBlock:
    return update_learn_block(db, learn_id, learn_block, user)


@router.delete("/learn-blocks/{learn_id}", operation_id="delete_learn_block", status_code=204)
async def endp_delete_learn_block(
    learn_id: int, db: SessionSqlSessionDependency, user: CurrentUser
) -> None:
    delete_learn_block(db, learn_id, user)
