from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, and_, select
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
