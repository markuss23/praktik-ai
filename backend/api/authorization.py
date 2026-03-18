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


def _check_resource_exists(resource: OwnedResource, resource_name: str) -> None:
    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f"{resource_name.capitalize()} nenalezen",
        )


def _is_owner(resource: OwnedResource, user: User) -> bool:
    return int(resource.get_owner_id()) == int(user.user_id)


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
    _check_resource_exists(resource, resource_name)

    # Guarantor and superadmin can access any resource
    if allow_elevated and user.role in _ELEVATED_ROLES:
        return

    if not _is_owner(resource, user):
        raise HTTPException(
            status_code=403,
            detail=f"Nemáte oprávnění upravovat tento {resource_name}",
        )


def validate_owner_or_superadmin(
    resource: OwnedResource,
    user: User,
    resource_name: str = "zdroj",
) -> None:
    """
    Povolí přístup pouze vlastníkovi nebo superadminovi.
    Garant (guarantor) NEMÁ přístup k cizím zdrojům.
    """
    _check_resource_exists(resource, resource_name)

    if user.role == UserRole.superadmin:
        return

    if not _is_owner(resource, user):
        raise HTTPException(
            status_code=403,
            detail=f"Nemáte oprávnění upravovat tento {resource_name}",
        )


def validate_guarantor_or_superadmin(
    resource: OwnedResource,
    user: User,
    resource_name: str = "zdroj",
) -> None:
    """
    Povolí přístup pouze garantovi nebo superadminovi (NE vlastníkovi, pokud není superadmin).
    Používá se pro schvalování/zamítání kurzů.
    """
    _check_resource_exists(resource, resource_name)

    if user.role in (UserRole.guarantor, UserRole.superadmin):
        return

    raise HTTPException(
        status_code=403,
        detail=f"Nemáte oprávnění schvalovat tento {resource_name}",
    )
