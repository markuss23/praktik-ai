"""
Autorizační funkce pro ověření vlastnictví zdrojů.
"""

from fastapi import HTTPException
from typing import Protocol


class OwnedResource(Protocol):
    """Protocol pro entity, které mají get_owner_id metodu."""
    
    def get_owner_id(self) -> str:
        """Vrátí ID vlastníka zdroje."""
        ...


def validate_ownership(
    resource: OwnedResource,
    user: dict,
    resource_name: str = "zdroj"
) -> None:
    """
    Validuje, zda je uživatel vlastníkem daného zdroje.
    
    Args:
        resource: Entita s metodou get_owner_id()
        user: Slovník s informacemi o uživateli (z Keycloak)
        resource_name: Název zdroje pro chybovou zprávu
        
    Raises:
        HTTPException: 403 pokud uživatel není vlastník
    """
    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f"{resource_name.capitalize()} nenalezen"
        )
    
    # Získáme user_id z Keycloak user_info
    user_id = user.get("sub")  # "sub" je standardní claim pro user ID v JWT/OIDC
    
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Neplatná autentizace uživatele"
        )
    
    owner_id = resource.get_owner_id()
    
    if owner_id != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Nemáte oprávnění upravovat tento {resource_name}"
        )
