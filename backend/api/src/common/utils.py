from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

T = TypeVar("T")


def get_or_404(
    db: Session,
    model: type[T],
    pk_value: int,
    *,
    detail: str | None = None,
    check_active: bool = True,
) -> T:
    """Načte záznam podle primárního klíče, nebo vyhodí 404.

    Args:
        db: SQLAlchemy session
        model: ORM model class
        pk_value: hodnota primárního klíče
        detail: vlastní chybová hláška (výchozí: „{Model} nenalezen/a")
        check_active: přidat podmínku is_active=True (výchozí True)
    """
    pk_col = inspect(model).mapper.primary_key[0]
    stm = select(model).where(pk_col == pk_value)
    if check_active and hasattr(model, "is_active"):
        stm = stm.where(model.is_active.is_(True))
    result = db.scalars(stm).first()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=detail or f"{model.__name__} nenalezen/a",
        )
    return result
