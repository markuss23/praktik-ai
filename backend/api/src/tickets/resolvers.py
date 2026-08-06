from typing import Protocol

from sqlalchemy.orm import Session

from api import models
from api.enums import TicketEntityType, UserRole
from api.src.common.utils import check_enrollment, get_or_404


class TicketEntityResolver(Protocol):
    """Zapouzdřuje pravidla specifická pro jeden entity_type"""

    def load_entity(self, db: Session, entity_id: int):
        """Načte entitu podle entity_id, nebo vyhodí 404."""
        ...

    def authorize_create(self, db: Session, actor: models.User, entity) -> None:
        """Vyhodí 403, pokud actor nemá právo k této entitě ticket založit."""
        ...

    def is_staff_for(self, actor: models.User, entity) -> bool:
        """True, pokud actor smí na ticket k této entitě odpovídat / uzavřít ho."""
        ...

    def get_course_id(self, entity) -> int | None:
        """Kurz, pod který entita spadá — pro denormalizaci na ticketu (nullable)."""
        ...


class ModuleTicketResolver:
    """Ticket vázaný na modul — reklamace AI hodnocení v rámci modulu.
    Staff = autor kurzu, garant nebo superadmin; založit ticket smí jen
    student zapsaný v kurzu, kterému modul patří."""

    def load_entity(self, db: Session, entity_id: int) -> models.Module:
        return get_or_404(db, models.Module, entity_id, detail="Modul nenalezen")

    def authorize_create(
        self, db: Session, actor: models.User, entity: models.Module
    ) -> None:
        check_enrollment(db, actor, entity.course)

    def is_staff_for(self, actor: models.User, entity: models.Module) -> bool:
        return (
            actor.role in (UserRole.guarantor, UserRole.superadmin)
            or entity.course.owner_id == actor.user_id
        )

    def get_course_id(self, entity: models.Module) -> int:
        return entity.course_id


RESOLVERS: dict[TicketEntityType, TicketEntityResolver] = {
    TicketEntityType.module: ModuleTicketResolver(),
}


def get_resolver(entity_type: TicketEntityType) -> TicketEntityResolver:
    resolver = RESOLVERS.get(entity_type)
    if resolver is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400, detail=f"Nepodporovaný typ entity: {entity_type}"
        )
    return resolver
