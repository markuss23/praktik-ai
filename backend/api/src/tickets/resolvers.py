from typing import Protocol

from sqlalchemy.orm import Session

from api import models
from api.enums import TicketEntityType, TicketType, UserRole
from api.src.common.utils import check_enrollment, get_or_404

# Kategorie dostupné pro libovolný entity_type navíc k jeho allowed_categories —
# bug/dotaz dává smysl nahlásit ke konkrétní entitě (modulu...) i bez entity.
UNIVERSAL_CATEGORIES: set[TicketType] = {TicketType.bug, TicketType.question}


class TicketEntityResolver(Protocol):
    """Zapouzdřuje pravidla specifická pro jeden entity_type."""

    allowed_categories: set[TicketType]

    def load_entity(self, db: Session, entity_id: int | None):
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
    """Ticket vázaný na modul — reklamace AI hodnocení v rámci modulu. Založit ticket smí jen
    student zapsaný v kurzu, kterému modul patří."""

    allowed_categories = {
        TicketType.task_session,
        TicketType.practice,
        TicketType.other,
    }

    def load_entity(self, db: Session, entity_id: int) -> models.Module:
        return get_or_404(db, models.Module, entity_id, detail="Modul nenalezen")

    def authorize_create(
        self, db: Session, actor: models.User, entity: models.Module
    ) -> None:
        check_enrollment(db, actor, entity.course)

    def is_staff_for(self, actor: models.User, entity: models.Module) -> bool:
        return actor.role in (UserRole.guarantor, UserRole.superadmin, UserRole.lector)

    def get_course_id(self, entity: models.Module) -> int:
        return entity.course_id


class GeneralTicketResolver:
    """Ticket bez vazby na entitu (bug/dotaz) — smí založit kdokoliv přihlášený,
    staff je jen garant/superadmin/lektor."""

    allowed_categories: set[TicketType] = set()

    def load_entity(self, db: Session, entity_id: int | None) -> None:
        return None

    def authorize_create(self, db: Session, actor: models.User, entity) -> None:
        pass

    def is_staff_for(self, actor: models.User, entity) -> bool:
        return actor.role in (UserRole.guarantor, UserRole.superadmin, UserRole.lector)

    def get_course_id(self, entity) -> None:
        return None


RESOLVERS: dict[TicketEntityType, TicketEntityResolver] = {
    TicketEntityType.module: ModuleTicketResolver(),
    TicketEntityType.general: GeneralTicketResolver(),
}


def get_resolver(entity_type: TicketEntityType) -> TicketEntityResolver:
    resolver = RESOLVERS.get(entity_type)
    if resolver is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400, detail=f"Nepodporovaný typ entity: {entity_type}"
        )
    return resolver


def get_allowed_categories(entity_type: TicketEntityType) -> set[TicketType]:
    """Kategorie povolené pro daný entity_type = jeho specifické + univerzální (bug/dotaz)."""
    return get_resolver(entity_type).allowed_categories | UNIVERSAL_CATEGORIES
