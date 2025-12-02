from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, and_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.src.modules.schemas import Module, ModuleCreate
from app import models


def get_modules(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    course_id: int | None = None,
) -> list[Module]:
    """
    Vrátí seznam modulů s volitelnými filtry:
    - include_inactive: zahrnout i neaktivní (jinak jen aktivní)
    - text_search: fulltext přes title
    - course_id: moduly jen pro daný kurz
    """
    try:
        stm: Select[tuple[models.Module]] = select(models.Module)

        if not include_inactive:
            stm = stm.where(models.Module.is_active.is_(True))

        if course_id is not None:
            stm = stm.where(models.Module.course_id == course_id)

        if text_search:
            stm = stm.where(models.Module.title.ilike(f"%{text_search}%"))

        # doporučené řazení: nejdřív podle course_id, pak order
        stm = stm.order_by(models.Module.course_id, models.Module.order)

        rows: Sequence[models.Module] = db.execute(stm).scalars().all()
        return [Module.model_validate(m) for m in rows]
    except Exception as e:
        print(f"get_modules error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def create_module(db: Session, data: ModuleCreate) -> Module:
    """
    Vytvoří modul. Ošetřuje unikátní kombinaci (course_id, order).
    """
    try:
        if (
            db.execute(
                select(models.Course).where(models.Course.course_id == data.course_id)
            ).first()
            is None
        ):
            raise HTTPException(
                status_code=404,
                detail="Kurz neexistuje.",
            )
        # Volitelný pre-check unikátu (rychlá validace před DB constraintem)
        exists_stm: Select[tuple[models.Module]] = select(models.Module).where(
            and_(
                models.Module.course_id == data.course_id,
                models.Module.order == data.order,
            )
        )
        if db.execute(exists_stm).first():
            raise HTTPException(
                status_code=400,
                detail="Modul s tímto pořadím pro daný kurz již existuje.",
            )

        obj = models.Module(**data.model_dump())
        obj.is_active = True

        db.add(obj)
        db.commit()
        db.refresh(obj)
        return Module.model_validate(obj)
    except HTTPException:
        raise
    except IntegrityError as ie:
        raise HTTPException(
            status_code=400,
            detail="Modul s tímto pořadím pro daný kurz již existuje.",
        ) from ie
    except Exception as e:
        print(f"create_module error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def get_module(db: Session, module_id: int) -> Module:
    """
    Vrátí konkrétní modul podle module_id
    """
    try:
        stm: Select[tuple[models.Module]] = select(models.Module).where(
            models.Module.module_id == module_id
        )

        result: models.Module | None = db.execute(stm).scalars().first()

        if result is None:
            raise HTTPException(status_code=404, detail="Module not found")

        return Module.model_validate(result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_module error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_module(db: Session, module_id: int, module_data: ModuleCreate) -> Module:
    """
    Upraví data modulu s module_id podle dat v module_data

    """
    try:
        stm: Select[tuple[models.Module]] = select(models.Module).where(
            models.Module.module_id == module_id
        )

        module: models.Module | None = db.execute(stm).scalars().first()

        if module is None:
            raise HTTPException(status_code=404, detail="Module not found")

        exists_stm: Select[tuple[models.Module]] = select(models.Module).where(
            models.Course.course_id == module_data.course_id
        )

        # kontrola, zda kurz existuje
        if db.execute(exists_stm).first() is None:
            raise HTTPException(
                status_code=404,
                detail="Kurz neexistuje.",
            )

        # kontrola, zda neni prekryvajici modul (vyjma aktuálně editovaného)
        exists_stm: Select[tuple[models.Module]] = select(models.Module).where(
            and_(
                models.Module.course_id == module_data.course_id,
                models.Module.order == module_data.order,
                models.Module.module_id != module_id, 
            )
        )

        if db.execute(exists_stm).first() is not None:
            raise HTTPException(
                status_code=400,
                detail="Modul s tímto pořadím pro daný kurz již existuje.",
            )

        stm = (
            update(models.Module)
            .where(models.Module.module_id == module_id)
            .values(**module_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(module)

        return Module.model_validate(module)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_module error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_module(db: Session, module_id: int) -> None:
    """
    Smaže modul podle module_id (soft delete - nastaví is_active=False)
    """
    try:
        stm: Select[tuple[models.Module]] = select(models.Module).where(
            models.Module.module_id == module_id
        )

        module: models.Module | None = db.execute(stm).scalars().first()

        if module is None:
            raise HTTPException(status_code=404, detail="Module not found")

        # Soft delete - nastavíme is_active na False
        module.is_active = False
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_module error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
