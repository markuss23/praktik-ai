from fastapi import APIRouter
from api.src.categories.controllers import (
    get_categories,
    create_category,
    delete_category,
)
from api.src.categories.schemas import Category, CategoryCreate
from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", operation_id="list_categories")
async def list_categories(
    db: SessionSqlSessionDependency,
    include_inactive: bool = False,
) -> list[Category]:
    return get_categories(db=db, include_inactive=include_inactive)


@router.post("", operation_id="create_category")
async def endp_create_category(
    category: CategoryCreate,
    db: SessionSqlSessionDependency,
) -> Category:
    return create_category(db=db, category_data=category)


@router.delete("/{category_id}", operation_id="delete_category")
async def endp_delete_category(
    category_id: int,
    db: SessionSqlSessionDependency,
) -> None:
    return delete_category(db=db, category_id=category_id)
