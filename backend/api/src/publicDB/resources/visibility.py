"""
Pravidla viditelnosti veřejných materiálů (pub_resource).

Kdo materiál vidí:
- superadmin vždy,
- autor vždy svůj materiál (aby mohl upravovat koncept nebo vrácený materiál);
  ve výpisu jen aktivní,
- garant materiál ve stavu pending_review (schvaluje ho),
- ostatní jen materiál, který je publikovaný, aktivní a není draft ani rejected.

Stejné pravidlo existuje ve dvou podobách: `resource_visible_to` pro jeden
načtený materiál a `resource_visibility_clause` jako SQL podmínka pro výpis.
"""

from fastapi import HTTPException
from sqlalchemy import ColumnElement, and_, or_
from sqlalchemy.orm import Session

from api import models
from api.enums import PubResourceStatus, UserRole
from api.src.common.utils import get_or_404

HIDDEN_STATUSES = (PubResourceStatus.draft, PubResourceStatus.rejected)


def is_superadmin(user: models.User | None) -> bool:
    """
    Vrátí True, pokud je uživatel superadmin.

    """
    return user is not None and user.role == UserRole.superadmin


def is_reviewer(user: models.User | None) -> bool:
    """
    Vrátí True, pokud uživatel schvaluje materiály (garant nebo výš).

    """
    from api.dependencies import ROLE_HIERARCHY

    return (
        user is not None
        and ROLE_HIERARCHY.get(user.role, 0) >= ROLE_HIERARCHY["guarantor"]
    )


def resource_visible_to(resource: models.PubResource, user: models.User | None) -> bool:
    """
    Rozhodne, jestli uživatel smí vidět daný materiál.

    """
    if is_superadmin(user):
        return True
    if user is not None and resource.author_id == user.user_id:
        return True
    if not resource.is_active:
        return False
    if is_reviewer(user) and resource.status == PubResourceStatus.pending_review:
        return True
    return resource.is_public and resource.status not in HIDDEN_STATUSES


def resource_visibility_clause(user: models.User | None) -> ColumnElement[bool]:
    """
    SQL podmínka pro výpis materiálů, které uživatel smí vidět.

    Cizí draft a rejected se nevrací nikomu (ani superadminovi). Superadmin
    vidí i nepublikované a neaktivní, garant navíc pending_review, ostatní jen
    publikované a aktivní. Autor navíc vidí všechny své aktivní materiály
    v jakémkoli stavu.

    Args:
        user: Přihlášený uživatel, nebo None pro nepřihlášeného.
    """
    is_active = models.PubResource.is_active.is_(True)
    not_hidden = models.PubResource.status.not_in(HIDDEN_STATUSES)

    if is_superadmin(user):
        others = not_hidden
    else:
        visible = models.PubResource.is_public.is_(True)
        if is_reviewer(user):
            visible = or_(
                visible, models.PubResource.status == PubResourceStatus.pending_review
            )
        others = and_(not_hidden, is_active, visible)

    if user is None:
        return others
    own = and_(models.PubResource.author_id == user.user_id, is_active)
    return or_(others, own)


def ensure_resource_visible(
    db: Session, resource_id: int, user: models.User | None
) -> models.PubResource:
    """
    Načte materiál, nebo vyhodí 404, pokud neexistuje nebo ho uživatel nesmí vidět.

    Skrytý materiál dostane stejnou hlášku jako neexistující, aby nešlo zjistit,
    která ID existují.
    """
    resource = get_or_404(
        db,
        models.PubResource,
        resource_id,
        detail="Materiál nenalezen",
        check_active=False,
    )
    if not resource_visible_to(resource, user):
        raise HTTPException(status_code=404, detail="Materiál nenalezen")
    return resource
