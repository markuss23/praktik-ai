"""
Autorizační funkce pro ověření vlastnictví zdrojů.
"""

from fastapi import HTTPException
from typing import Protocol

from api.models import User
from api.enums import UserRole


class OwnedResource(Protocol):
    """Protocol pro entity, které mají get_owner_id metodu."""

    def get_owner_id(self) -> int:
        """Vrátí user_id vlastníka zdroje."""
        ...


# Roles that can bypass ownership checks
_ELEVATED_ROLES: set[str] = {UserRole.guarantor, UserRole.superadmin}


def validate_ownership(
    resource: OwnedResource,
    user: User,
    resource_name: str = "zdroj",
    allow_elevated: bool = True,
) -> None:
    """
    Validuje, zda je uživatel vlastníkem daného zdroje.
    Guarantor a superadmin mají přístup ke všem zdrojům (pokud allow_elevated=True).

    Args:
        resource: Entita s metodou get_owner_id()
        user: Přihlášený uživatel (User ORM objekt)
        resource_name: Název zdroje pro chybovou zprávu
        allow_elevated: Zda guarantor/superadmin obcházejí kontrolu vlastnictví

    Raises:
        HTTPException: 403 pokud uživatel není vlastník a nemá elevated roli
    """
    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f"{resource_name.capitalize()} nenalezen",
        )

    # Guarantor and superadmin can access any resource
    if allow_elevated and user.role in _ELEVATED_ROLES:
        return

    owner = int(resource.get_owner_id())
    user_id = int(user.user_id)
    if owner != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Nemáte oprávnění upravovat tento {resource_name}",
        )
