from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models import (
    BloomLevel,
    CourseBlock,
    CourseEqfLevel,
    CourseRequirement,
    CourseSubject,
    CourseTarget,
    CourseType,
    KrauuCompetence,
    NeuroPrinciple,
)


def get_course_blocks(db: Session) -> list[CourseBlock]:
    return db.query(CourseBlock).filter(CourseBlock.is_active.is_(True)).all()


def get_course_targets(db: Session) -> list[CourseTarget]:
    return db.query(CourseTarget).filter(CourseTarget.is_active.is_(True)).all()


def get_course_subjects(db: Session) -> list[CourseSubject]:
    return db.query(CourseSubject).filter(CourseSubject.is_active.is_(True)).all()


def get_course_requirements(db: Session) -> list[CourseRequirement]:
    return (
        db.query(CourseRequirement)
        .filter(CourseRequirement.is_active.is_(True))
        .all()
    )


def get_course_eqf_levels(db: Session) -> list[CourseEqfLevel]:
    return db.query(CourseEqfLevel).filter(CourseEqfLevel.is_active.is_(True)).all()


def get_course_types(db: Session) -> list[CourseType]:
    return db.query(CourseType).filter(CourseType.is_active.is_(True)).all()


def get_neuro_principles(db: Session) -> list[NeuroPrinciple]:
    return db.query(NeuroPrinciple).filter(NeuroPrinciple.is_active.is_(True)).all()


def get_krauu_competences(db: Session) -> list[KrauuCompetence]:
    return (
        db.query(KrauuCompetence)
        .filter(KrauuCompetence.is_active.is_(True))
        .order_by(KrauuCompetence.code)
        .all()
    )


def validate_krauu_competence_ids(db: Session, krauu_ids: list[int]) -> None:
    """Vybírat lze jen kompetence (řádky s rodičem), ne oblasti."""
    found = set(
        db.execute(
            select(KrauuCompetence.krauu_id).where(
                KrauuCompetence.krauu_id.in_(krauu_ids),
                KrauuCompetence.is_active.is_(True),
                KrauuCompetence.parent_id.is_not(None),
            )
        )
        .scalars()
        .all()
    )
    missing = set(krauu_ids) - found
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"KRAUU kompetence s ID {sorted(missing)} neexistují nebo jde o oblast (vybírat lze jen kompetence)",
        )


def sync_m2m_links(
    db: Session,
    link_model,
    owner_column: str,
    owner_id: int,
    target_column: str,
    target_ids: list[int],
) -> None:
    """Synchronizuje M2M vazby (soft delete nepotřebných, reaktivace a doplnění)."""
    wanted = set(target_ids)
    owner_col = getattr(link_model, owner_column)
    existing: Sequence = (
        db.execute(select(link_model).where(owner_col == owner_id)).scalars().all()
    )
    existing_by_id = {getattr(link, target_column): link for link in existing}

    for target_id, link in existing_by_id.items():
        link.is_active = target_id in wanted

    for target_id in wanted - existing_by_id.keys():
        db.add(link_model(**{owner_column: owner_id, target_column: target_id}))


def sync_krauu_competences(
    db: Session, link_model, owner_column: str, owner_id: int, krauu_ids: list[int]
) -> None:
    sync_m2m_links(db, link_model, owner_column, owner_id, "krauu_id", krauu_ids)


def get_bloom_levels(db: Session) -> list[BloomLevel]:
    return (
        db.query(BloomLevel)
        .filter(BloomLevel.is_active.is_(True))
        .order_by(BloomLevel.code)
        .all()
    )


def validate_bloom_level_ids(db: Session, bloom_ids: list[int]) -> None:
    found = set(
        db.execute(
            select(BloomLevel.bloom_id).where(
                BloomLevel.bloom_id.in_(bloom_ids),
                BloomLevel.is_active.is_(True),
            )
        )
        .scalars()
        .all()
    )
    missing = set(bloom_ids) - found
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Bloomovy úrovně s ID {sorted(missing)} neexistují",
        )


def sync_bloom_levels(
    db: Session, link_model, owner_column: str, owner_id: int, bloom_ids: list[int]
) -> None:
    sync_m2m_links(db, link_model, owner_column, owner_id, "bloom_id", bloom_ids)
