from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, and_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.src.modules.schemas import Module, ModuleCreate, ModuleUpdate
from api import enums, models


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

        # doporučené řazení: nejdřív podle course_id, pak position
        stm = stm.order_by(models.Module.course_id, models.Module.position)

        rows: Sequence[models.Module] = db.execute(stm).scalars().all()
        return [Module.model_validate(m) for m in rows]
    except Exception as e:
        print(f"get_modules error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def create_module(db: Session, data: ModuleCreate) -> Module:
    """
    Vytvoří modul. Ošetřuje unikátní kombinaci (course_id, position).
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
                models.Module.position == data.position,
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
            raise HTTPException(status_code=404, detail="Modul nenalezen")

        return Module.model_validate(result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_module error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_module(db: Session, module_id: int, module_data: ModuleUpdate) -> Module:
    """
    Upraví data modulu s module_id podle dat v module_data

    """
    try:
        stm: Select[tuple[models.Module]] = select(models.Module).where(
            models.Module.module_id == module_id,
            models.Module.is_active.is_(True),
        )

        module: models.Module | None = db.execute(stm).scalars().first()

        if module is None:
            raise HTTPException(status_code=404, detail="Modul nenalezen")

        # kontrola, zda je kurz ve stavu generated
        if module.course.status != enums.Status.generated:
            raise HTTPException(
                status_code=400,
                detail="Modul lze editovat pouze pokud je kurz ve stavu 'generated'.",
            )

        # kontrola unikátnosti názvu (pokud se mění)
        if module_data.title != module.title:
            title_exists_stm: Select[tuple[models.Module]] = select(models.Module).where(
                and_(
                    models.Module.course_id == module.course_id,
                    models.Module.title == module_data.title,
                    models.Module.is_active.is_(True),
                    models.Module.module_id != module_id,
                )
            )
            if db.execute(title_exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Modul s tímto názvem pro daný kurz již existuje.",
                )

        # kontrola, zda neni prekryvajici modul (vyjma aktuálně editovaného)
        # používáme existující course_id modulu, protože ModuleUpdate ho neobsahuje
        if module_data.position != module.position:
            exists_stm: Select[tuple[models.Module]] = select(models.Module).where(
                and_(
                    models.Module.course_id == module.course_id,
                    models.Module.position == module_data.position,
                    models.Module.is_active.is_(True),
                    models.Module.module_id != module_id,
                )
            )

            if db.execute(exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Modul s tímto pořadím pro daný kurz již existuje.",
                )

            # kontrola, že position tvoří souvislou posloupnost
            # získáme všechny aktivní moduly kurzu (kromě aktuálního)
            all_modules_stm: Select[tuple[models.Module]] = select(models.Module).where(
                and_(
                    models.Module.course_id == module.course_id,
                    models.Module.is_active.is_(True),
                    models.Module.module_id != module_id,
                )
            ).order_by(models.Module.position)

            other_modules = db.execute(all_modules_stm).scalars().all()

            # vytvoříme seznam všech position hodnot včetně nové
            all_orders = [m.position for m in other_modules] + [module_data.position]
            all_orders.sort()

            # kontrola, že tvoří souvislou posloupnost 1, 2, 3, ...
            expected_orders = list(range(1, len(all_orders) + 1))
            if all_orders != expected_orders:
                raise HTTPException(
                    status_code=400,
                    detail=f"Pořadí modulů musí tvořit souvislou posloupnost od 1. Očekávané hodnoty: {expected_orders}, nalezené: {all_orders}",
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
