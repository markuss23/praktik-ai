from collections.abc import Sequence
from fastapi import HTTPException
from sqlalchemy import Select, select, update, and_
from sqlalchemy.orm import Session

from app import models
from app.models import ActivityKind
from app.src.activities.schemas import ActivityCreate, Activity


def get_activities(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    module_id: int | None = None,
    kind: ActivityKind | None = None,
) -> list[Activity]:
    """
    Vrátí seznam aktivit s volitelnými filtry:
    - include_inactive: zahrnout i neaktivní (jinak jen aktivní)
    - text_search: fulltext přes title
    - module_id: aktivity jen pro daný modul
    - kind: aktivity jen pro daný typ
    """

    try:
        stm: Select[tuple[models.Activity]] = select(models.Activity)

        if not include_inactive:
            stm = stm.where(models.Activity.is_active.is_(True))

        if module_id is not None:
            stm = stm.where(models.Activity.module_id == module_id)

        if kind is not None:
            stm = stm.where(models.Activity.kind == kind)

        if text_search:
            stm = stm.where(models.Activity.title.ilike(f"%{text_search}%"))

        stm = stm.order_by(models.Activity.module_id, models.Activity.order)

        rows: Sequence[models.Activity] = db.execute(stm).scalars().all()
        return [Activity.model_validate(a) for a in rows]

    except Exception as e:
        print(f"get_activity error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def create_activity(db: Session, activity_data: ActivityCreate) -> Activity:
    """
    Vytvoří aktivitu
    """
    try:
        if db.execute(
            select(models.Activity).where(models.Activity.title == activity_data.title)
        ).first():
            raise HTTPException(
                status_code=400, detail="Aktivita s tímto názvem již existuje"
            )

        if db.execute(
            select(models.Activity).where(
                and_(
                    models.Activity.module_id == activity_data.module_id,
                    models.Activity.order == activity_data.order,
                )
            )
        ).first():
            raise HTTPException(
                status_code=400, detail="Aktivita s tímto poradovým číslom již existuje"
            )
        if (
            db.execute(
                select(models.Module).where(
                    models.Module.module_id == activity_data.module_id
                )
            ).first()
            is None
        ):
            raise HTTPException(status_code=404, detail="Modul neexistuje")

        activity = models.Activity(**activity_data.model_dump())

        activity.is_active = True

        db.add(activity)
        db.commit()
        db.refresh(activity)

        return activity

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_activity error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def get_activity(db: Session, activity_id: int) -> Activity:
    """
    Vrátí aktivitu podle activity_id
    """
    try:
        stm: Select[tuple[models.Activity]] = select(models.Activity).where(
            models.Activity.activity_id == activity_id
        )

        result: models.Activity | None = db.execute(stm).scalars().first()

        if result is None:
            raise HTTPException(status_code=404, detail="Activity not found")

        return Activity.model_validate(result)
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_activity error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e


def update_activity(
    db: Session, activity_id: int, activity_data: ActivityCreate
) -> Activity:
    try:
        stm: Select[tuple[models.Activity]] = select(models.Activity).where(
            models.Activity.activity_id == activity_id
        )

        activity: models.Activity | None = db.execute(stm).scalars().first()

        if activity is None:
            raise HTTPException(status_code=404, detail="Activity not found")

        stm = (
            update(models.Activity)
            .where(models.Activity.activity_id == activity_id)
            .values(**activity_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(activity)

        return Activity.model_validate(activity)
    except HTTPException:
        raise
    except Exception as e:
        print(f"update_activity error: {e}")
        raise HTTPException(status_code=500, detail=" Nečekávaná chyba serveru") from e
