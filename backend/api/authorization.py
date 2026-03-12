"""
Autorizační funkce pro ověření vlastnictví zdrojů.
"""

from fastapi import HTTPException
from typing import Protocol

from api.models import User
from api.enums import UserRole

ROLE_HIERARCHY: dict[str, int] = {
    UserRole.user: 1,
    UserRole.lector: 2,
    UserRole.guarantor: 3,
    UserRole.superadmin: 4,
}


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

    Prozatím : Uživatelé s rolí lector nebo vyšší mohou editovat libovolný zdroj BEZ ohledu na vlastnictví.

    Args:
        resource: Entita s metodou get_owner_id()
        user: Přihlášený uživatel (User ORM objekt)
        resource_name: Název zdroje pro chybovou zprávu

    Raises:
        HTTPException: 403 pokud uživatel není vlastník ani nemá dostatečnou roli
    """
    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f"{resource_name.capitalize()} nenalezen",
        )

    # Lector a výše mohou editovat libovolný zdroj (prozatím)
    user_level = ROLE_HIERARCHY.get(user.role, 0)
    if user_level >= ROLE_HIERARCHY[UserRole.lector]:
        return

    owner = int(resource.get_owner_id())
    user_id = int(user.user_id)
    if owner != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Nemáte oprávnění upravovat tento {resource_name}",
        )
