"""
Autorizační funkce pro ověření vlastnictví zdrojů.
"""

from fastapi import HTTPException
from typing import Protocol

from api.models import User


class OwnedResource(Protocol):
    """Protocol pro entity, které mají get_owner_id metodu."""

    def get_owner_id(self) -> int:
        """Vrátí user_id vlastníka zdroje."""
        ...


def validate_ownership(
    resource: OwnedResource,
    user: User,
    resource_name: str = "zdroj",
) -> None:
    """
    Validuje, zda je uživatel vlastníkem daného zdroje.

    Args:
        resource: Entita s metodou get_owner_id()
        user: Přihlášený uživatel (User ORM objekt)
        resource_name: Název zdroje pro chybovou zprávu

    Raises:
        HTTPException: 403 pokud uživatel není vlastník
    """
    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f"{resource_name.capitalize()} nenalezen",
        )
    owner = int(resource.get_owner_id())
    user_id = int(user.user_id)
    if owner != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Nemáte oprávnění upravovat tento {resource_name}",
        )
