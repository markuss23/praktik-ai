"""
Controllery pro čtení veřejných materiálů.
"""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.src.common.utils import get_or_404
from api.src.publicDB.resources.schemas import PubResource, PubResourceFile


def get_resources(
    db: Session,
    include_inactive: bool = False,
    text_search: str | None = None,
    is_public: bool = False,
    education_level: int | None = None,
    difficulty_level: int | None = None,
    resource_target_id: int | None = None,
    resource_subject_id: int | None = None,
    status: str | None = None,
    is_fork: bool | None = None,
    original_id: int | None = None,
) -> list[PubResource]:
    """Vrátí seznam veřejných materiálů s filtrací.
    Doplňuje počty hodnocení, souborů a kolirát si nekdo vytvořil kopii. (fork)
    """
    ratings_count_subq = (
        select(
            models.PubResourceRating.resource_id.label("resource_id"),
            func.count(models.PubResourceRating.rating_id).label("ratings_cnt"),
            func.avg(models.PubResourceRating.score).label("avg_score"),
        )
        .where(models.PubResourceRating.is_active.is_(True))
        .group_by(models.PubResourceRating.resource_id)
        .subquery()
    )

    files_count_subq = (
        select(
            models.PubResourceFile.resource_id.label("resource_id"),
            func.count(models.PubResourceFile.file_id).label("files_cnt"),
        )
        .where(models.PubResourceFile.is_active.is_(True))
        .group_by(models.PubResourceFile.resource_id)
        .subquery()
    )

    forks_count_subq = (
        select(
            models.PubResourceFork.original_id.label("resource_id"),
            func.count(models.PubResourceFork.fork_id).label("forks_cnt"),
        )
        .where(models.PubResourceFork.is_active.is_(True))
        .group_by(models.PubResourceFork.original_id)
        .subquery()
    )

    # subquery pro zjištění original_id (z čeho byl fork vytvořen)
    forked_from_subq = (
        select(
            models.PubResourceFork.forked_id.label("resource_id"),
            models.PubResourceFork.original_id.label("original_id"),
        )
        .where(models.PubResourceFork.is_active.is_(True))
        .subquery()
    )

    ratings_count_col = func.coalesce(ratings_count_subq.c.ratings_cnt, 0).label(
        "ratings_count"
    )
    avg_rating_col = ratings_count_subq.c.avg_score.label("avg_rating")
    files_count_col = func.coalesce(files_count_subq.c.files_cnt, 0).label(
        "files_count"
    )
    forks_count_col = func.coalesce(forks_count_subq.c.forks_cnt, 0).label(
        "forks_count"
    )
    forked_from_col = forked_from_subq.c.original_id.label("forked_from_id")

    stm = (
        select(
            models.PubResource,
            ratings_count_col,
            avg_rating_col,
            files_count_col,
            forks_count_col,
            forked_from_col,
        )
        .outerjoin(
            ratings_count_subq,
            models.PubResource.resource_id == ratings_count_subq.c.resource_id,
        )
        .outerjoin(
            files_count_subq,
            models.PubResource.resource_id == files_count_subq.c.resource_id,
        )
        .outerjoin(
            forks_count_subq,
            models.PubResource.resource_id == forks_count_subq.c.resource_id,
        )
        .outerjoin(
            forked_from_subq,
            models.PubResource.resource_id == forked_from_subq.c.resource_id,
        )
        .options(
            joinedload(models.PubResource.author),
            joinedload(models.PubResource.subject),
            joinedload(models.PubResource.target),
        )
        .order_by(models.PubResource.resource_id.desc())
    )

    if not include_inactive:
        stm = stm.where(models.PubResource.is_active.is_(True))

    if is_public:
        stm = stm.where(models.PubResource.is_public.is_(True))

    if text_search:
        stm = stm.where(
            or_(
                models.PubResource.title.ilike(f"%{text_search}%"),
                models.PubResource.description.ilike(f"%{text_search}%"),
            )
        )

    if education_level is not None:
        stm = stm.where(models.PubResource.education_level == education_level)

    if difficulty_level is not None:
        stm = stm.where(models.PubResource.difficulty_level == difficulty_level)

    if resource_target_id is not None:
        stm = stm.where(models.PubResource.target_id == resource_target_id)

    if resource_subject_id is not None:
        stm = stm.where(models.PubResource.subject_id == resource_subject_id)

    if status is not None:
        stm = stm.where(models.PubResource.status == status)

    if is_fork is not None:
        stm = stm.where(models.PubResource.is_fork.is_(is_fork))

    if original_id is not None:
        stm = stm.where(forked_from_subq.c.original_id == original_id)

    rows = db.execute(stm).all()
    result: list[PubResource] = []
    for resource, ratings_cnt, avg_rating, files_cnt, forks_cnt, forked_from_id in rows:
        resource.__dict__["ratings_count"] = int(ratings_cnt or 0)
        resource.__dict__["avg_rating"] = (
            float(round(avg_rating, 2)) if avg_rating is not None else None
        )
        resource.__dict__["files_count"] = int(files_cnt or 0)
        resource.__dict__["forks_count"] = int(forks_cnt or 0)
        resource.__dict__["forked_from_id"] = forked_from_id
        result.append(PubResource.model_validate(resource))
    return result


def get_resource(db: Session, resource_id: int) -> PubResource:
    """Vrátí detail materiálu podle ID s počty."""
    ratings_count_subq = (
        select(
            models.PubResourceRating.resource_id.label("resource_id"),
            func.count(models.PubResourceRating.rating_id).label("ratings_cnt"),
            func.avg(models.PubResourceRating.score).label("avg_score"),
        )
        .where(models.PubResourceRating.is_active.is_(True))
        .group_by(models.PubResourceRating.resource_id)
        .subquery()
    )

    files_count_subq = (
        select(
            models.PubResourceFile.resource_id.label("resource_id"),
            func.count(models.PubResourceFile.file_id).label("files_cnt"),
        )
        .where(models.PubResourceFile.is_active.is_(True))
        .group_by(models.PubResourceFile.resource_id)
        .subquery()
    )

    forks_count_subq = (
        select(
            models.PubResourceFork.original_id.label("resource_id"),
            func.count(models.PubResourceFork.fork_id).label("forks_cnt"),
        )
        .where(models.PubResourceFork.is_active.is_(True))
        .group_by(models.PubResourceFork.original_id)
        .subquery()
    )

    forked_from_subq = (
        select(
            models.PubResourceFork.forked_id.label("resource_id"),
            models.PubResourceFork.original_id.label("original_id"),
        )
        .where(models.PubResourceFork.is_active.is_(True))
        .subquery()
    )

    ratings_count_col = func.coalesce(ratings_count_subq.c.ratings_cnt, 0).label(
        "ratings_count"
    )
    avg_rating_col = ratings_count_subq.c.avg_score.label("avg_rating")
    files_count_col = func.coalesce(files_count_subq.c.files_cnt, 0).label(
        "files_count"
    )
    forks_count_col = func.coalesce(forks_count_subq.c.forks_cnt, 0).label(
        "forks_count"
    )
    forked_from_col = forked_from_subq.c.original_id.label("forked_from_id")

    stm = (
        select(
            models.PubResource,
            ratings_count_col,
            avg_rating_col,
            files_count_col,
            forks_count_col,
            forked_from_col,
        )
        .outerjoin(
            ratings_count_subq,
            models.PubResource.resource_id == ratings_count_subq.c.resource_id,
        )
        .outerjoin(
            files_count_subq,
            models.PubResource.resource_id == files_count_subq.c.resource_id,
        )
        .outerjoin(
            forks_count_subq,
            models.PubResource.resource_id == forks_count_subq.c.resource_id,
        )
        .outerjoin(
            forked_from_subq,
            models.PubResource.resource_id == forked_from_subq.c.resource_id,
        )
        .where(models.PubResource.resource_id == resource_id)
    )

    result = db.execute(stm).first()
    if result is None:
        get_or_404(
            db,
            models.PubResource,
            resource_id,
            detail="Materiál nenalezen",
            check_active=False,
        )

    resource, ratings_cnt, avg_rating, files_cnt, forks_cnt, forked_from_id = result
    resource.__dict__["ratings_count"] = int(ratings_cnt or 0)
    resource.__dict__["avg_rating"] = (
        float(round(avg_rating, 2)) if avg_rating is not None else None
    )
    resource.__dict__["files_count"] = int(files_cnt or 0)
    resource.__dict__["forks_count"] = int(forks_cnt or 0)
    resource.__dict__["forked_from_id"] = forked_from_id
    return PubResource.model_validate(resource)


def get_resource_files(db: Session, resource_id: int) -> list[PubResourceFile]:
    """Vrátí seznam souborů materiálu."""
    get_or_404(
        db,
        models.PubResource,
        resource_id,
        detail="Materiál nenalezen",
        check_active=False,
    )

    files = (
        db.execute(
            select(models.PubResourceFile).where(
                models.PubResourceFile.resource_id == resource_id
            )
        )
        .scalars()
        .all()
    )

    return [PubResourceFile.model_validate(f) for f in files]
