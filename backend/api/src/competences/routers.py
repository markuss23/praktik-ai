from fastapi import APIRouter

from api.database import SessionSqlSessionDependency
from api.dependencies import CurrentUser, require_role
from api.src.competences.controllers import (
    get_competence_stats,
    get_my_competence_profile,
)
from api.src.competences.schemas import CompetenceStatsItem, MyCompetenceItem

router = APIRouter(prefix="/competences", tags=["Competences"])


@router.get(
    "/my",
    operation_id="get_my_competence_profile",
    dependencies=[require_role("user")],
)
def endp_get_my_competence_profile(
    db: SessionSqlSessionDependency,
    user: CurrentUser,
) -> list[MyCompetenceItem]:
    """Kompetenční profil přihlášeného uživatele podle KRAUU: vstupní (pretest)
    a výstupní (test modulu / kurzu) úroveň, růst a historie skóre."""
    return get_my_competence_profile(db, user)


@router.get(
    "/stats",
    operation_id="get_competence_stats",
    dependencies=[require_role("superadmin")],
)
def endp_get_competence_stats(
    db: SessionSqlSessionDependency,
    course_id: int | None = None,
) -> list[CompetenceStatsItem]:
    """Agregace podle KRAUU přes všechny uživatele, volitelně za jeden kurz."""
    return get_competence_stats(db, course_id)
