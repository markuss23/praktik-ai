from fastapi import HTTPException
from sqlalchemy import select
from api import models
from api.src.categories.schemas import Category
from api.database import SessionSqlSessionDependency


def get_categories(
    db: SessionSqlSessionDependency,
    include_inactive: bool = False,
) -> list[Category]:
    """Vrátí seznam kategorií"""
    try:
        stm = select(models.Category).order_by(models.Category.category_id)

        if not include_inactive:
            stm = stm.where(models.Category.is_active.is_(True))

        rows = db.execute(stm).scalars().all()
        return [Category.model_validate(c) for c in rows]
    except Exception as e:
        print(f"get_categories error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def create_category(
    db: SessionSqlSessionDependency,
    category_data: Category,
) -> Category:
    """Vytvoří novou kategorii"""
    try:
        if db.execute(
            select(models.Category).where(
                models.Category.name == category_data.name,
                models.Category.is_active.is_(True),
            )
        ).first():
            raise HTTPException(
                status_code=400, detail="Kategorie s tímto názvem již existuje"
            )

        category = models.Category(**category_data.model_dump())

        db.add(category)
        db.commit()
        db.refresh(category)

        return category
    except HTTPException:
        raise
    except Exception as e:
        print(f"create_category error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def delete_category(
    db: SessionSqlSessionDependency,
    category_id: int,
) -> None:
    """Smaže kategorii podle ID"""
    try:
        category: models.Category | None = (
            db.execute(
                select(models.Category).where(
                    models.Category.category_id == category_id,
                    models.Category.is_active.is_(True),
                )
            )
            .scalars()
            .first()
        )

        if category is None:
            raise HTTPException(status_code=404, detail="Kategorie nenalezena")

        if category.courses:
            raise HTTPException(
                status_code=400,
                detail="Kategorie obsahuje kurzy a nemůže být smazána",
            )

        db.delete(category)
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_category error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e
