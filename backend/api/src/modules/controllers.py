from collections.abc import Sequence
from fastapi import HTTPException, Response
from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.src.common.utils import (
    assert_course_editable,
    attachment_response,
    course_visible_to,
    get_or_404,
)
from api.src.modules.schemas import Module, ModuleCreate, ModuleUpdate
from api import models
from api.storage import seaweedfs
from api.src.catalogs.controllers import (
    sync_bloom_levels,
    sync_krauu_competences,
    validate_bloom_level_ids,
    validate_krauu_competence_ids,
)
from api.authorization import validate_owner_or_superadmin
from api.dependencies import is_staff

TITLE_TAKEN = "Modul s tímto názvem pro daný kurz již existuje."


def _validate_neuro_principle_ids(db: Session, principle_ids: list[int]) -> None:
    found_ids = set(
        db.execute(
            select(models.NeuroPrinciple.principle_id).where(
                models.NeuroPrinciple.principle_id.in_(principle_ids),
                models.NeuroPrinciple.is_active.is_(True),
            )
        )
        .scalars()
        .all()
    )
    missing = set(principle_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Neurovědní princip(y) s ID {sorted(missing)} neexistují",
        )


def _sync_neuro_principles(
    db: Session, module: models.Module, principle_ids: list[int]
) -> None:
    wanted = set(principle_ids)
    existing_links: Sequence[models.ModuleNeuroPrinciple] = (
        db.execute(
            select(models.ModuleNeuroPrinciple).where(
                models.ModuleNeuroPrinciple.module_id == module.module_id,
            )
        )
        .scalars()
        .all()
    )

    existing_by_principle = {link.principle_id: link for link in existing_links}

    for principle_id, link in existing_by_principle.items():
        link.is_active = principle_id in wanted

    for principle_id in wanted - existing_by_principle.keys():
        db.add(
            models.ModuleNeuroPrinciple(
                module_id=module.module_id,
                principle_id=principle_id,
            )
        )


def _assert_title_free(
    db: Session, course_id: int, title: str, exclude_module_id: int | None = None
) -> None:
    stm = select(models.Module.module_id).where(
        models.Module.course_id == course_id,
        models.Module.title == title,
        models.Module.is_active.is_(True),
    )
    if exclude_module_id is not None:
        stm = stm.where(models.Module.module_id != exclude_module_id)
    if db.execute(stm).first() is not None:
        raise HTTPException(status_code=400, detail=TITLE_TAKEN)


def _commit_or_title_taken(db: Session) -> None:
    """Souběžný zápis projde kontrolou výše, chytí ho až uq_module_course_title_active."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=TITLE_TAKEN) from None


def get_modules(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    course_id: int | None = None,
    published_only: bool = False,
) -> list[Module]:
    """
    Vrátí seznam modulů s volitelnými filtry:
    - include_inactive: zahrnout i neaktivní (jinak jen aktivní)
    - text_search: fulltext přes title
    - course_id: moduly jen pro daný kurz
    - published_only: jen moduly publikovaných aktivních kurzů (pro studenty)
    """
    stm: Select[tuple[models.Module]] = select(models.Module)

    if not include_inactive:
        stm = stm.where(models.Module.is_active.is_(True))

    if published_only:
        stm = stm.join(
            models.Course, models.Course.course_id == models.Module.course_id
        ).where(models.Course.is_published.is_(True), models.Course.is_active.is_(True))

    if course_id is not None:
        stm = stm.where(models.Module.course_id == course_id)

    if text_search:
        stm = stm.where(models.Module.title.ilike(f"%{text_search}%"))

    stm = stm.order_by(models.Module.course_id, models.Module.module_id)

    rows: Sequence[models.Module] = db.execute(stm).scalars().all()
    return [Module.model_validate(m) for m in rows]


def create_module(db: Session, data: ModuleCreate, user: models.User) -> Module:
    """
    Vytvoří modul.
    """
    course = get_or_404(db, models.Course, data.course_id, detail="Kurz neexistuje.")

    # Validace vlastnictví kurzu
    validate_owner_or_superadmin(course, user, "modul")
    # Nový modul je změna obsahu — jen v editovatelném stavu, jinak by obešel schvalování
    assert_course_editable(course)
    _assert_title_free(db, course.course_id, data.title)

    _validate_neuro_principle_ids(db, data.neuro_principle_ids)
    validate_krauu_competence_ids(db, data.krauu_competence_ids)
    validate_bloom_level_ids(db, data.bloom_level_ids)

    module_data = data.model_dump(
        exclude={"neuro_principle_ids", "krauu_competence_ids", "bloom_level_ids"}
    )
    obj = models.Module(**module_data)
    obj.is_active = True

    db.add(obj)
    db.flush()  # získání module_id před přidáním principů

    _sync_neuro_principles(db, obj, data.neuro_principle_ids)
    sync_krauu_competences(
        db,
        models.ModuleKrauuCompetence,
        "module_id",
        obj.module_id,
        data.krauu_competence_ids,
    )
    sync_bloom_levels(
        db,
        models.ModuleBloomLevel,
        "module_id",
        obj.module_id,
        data.bloom_level_ids,
    )

    _commit_or_title_taken(db)
    db.refresh(obj)
    return Module.model_validate(obj)


def get_module(db: Session, module_id: int, user: models.User) -> Module:
    """
    Vrátí konkrétní modul podle module_id
    """
    # Smazaný modul vidí jen lektor a výš (stejně jako include_inactive v seznamu)
    module = get_or_404(
        db,
        models.Module,
        module_id,
        detail="Modul nenalezen",
        check_active=not is_staff(user),
    )
    # Obsah (vč. správných odpovědí) nepublikovaného kurzu jen lektorům+ a zapsaným studentům
    if not course_visible_to(db, module.course, user):
        raise HTTPException(status_code=404, detail="Modul nenalezen")
    return Module.model_validate(module)


def get_module_podcast(db: Session, module_id: int, user: models.User) -> Response:
    """Vrátí podcast modulu jako přílohu `<název modulu>.wav`. Vidí ho ten, kdo vidí modul (stejně jako get_module)."""
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")
    if not course_visible_to(db, module.course, user):
        raise HTTPException(status_code=404, detail="Modul nenalezen")
    if not module.podcast_path:
        raise HTTPException(status_code=404, detail="Modul nemá podcast")
    return attachment_response(
        seaweedfs.download_file(module.podcast_path), f"{module.title}.wav"
    )


def update_module(
    db: Session, module_id: int, module_data: ModuleUpdate, user: models.User
) -> Module:
    """
    Upraví data modulu s module_id podle dat v module_data.
    """
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")

    # Validace vlastnictví
    validate_owner_or_superadmin(module, user, "modul")

    # kontrola, zda je kurz v editovatelném stavu
    assert_course_editable(module.course)

    _assert_title_free(
        db, module.course_id, module_data.title, exclude_module_id=module_id
    )

    _validate_neuro_principle_ids(db, module_data.neuro_principle_ids)
    validate_krauu_competence_ids(db, module_data.krauu_competence_ids)
    validate_bloom_level_ids(db, module_data.bloom_level_ids)

    module.title = module_data.title
    module.perex = module_data.perex
    db.add(module)

    _sync_neuro_principles(db, module, module_data.neuro_principle_ids)
    sync_krauu_competences(
        db,
        models.ModuleKrauuCompetence,
        "module_id",
        module.module_id,
        module_data.krauu_competence_ids,
    )
    sync_bloom_levels(
        db,
        models.ModuleBloomLevel,
        "module_id",
        module.module_id,
        module_data.bloom_level_ids,
    )

    _commit_or_title_taken(db)
    db.refresh(module)

    return Module.model_validate(module)


def delete_module(db: Session, module_id: int, user: models.User) -> None:
    """Soft delete modulu s kaskádou (learn blok, vazby, testy modulu)."""
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")

    validate_owner_or_superadmin(module, user, "modul")
    assert_course_editable(module.course)

    module.soft_delete()
    db.commit()
