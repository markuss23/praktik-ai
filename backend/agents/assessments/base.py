"""
Základní kontrakt a registr interakčních formátů (assessments).

Každý formát (formulace otázek, sokratický dialog, rubrika, artefakt...)
implementuje ``BaseAssessmentService`` a zaregistruje se dekorátorem
``@register``. API vrstva (api/src/assessments) je generická — na typ
se nedívá, jen dispatchuje do registru podle ``assessment_type_code``.

Nový formát = nový balíček vedle question_formulation/ + import
v ``agents/assessments/__init__.py``. Routery ani DB se nemění.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import ClassVar

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from api import models
from api.enums import AssessmentSessionStatus, AssessmentTurnRole
from agents.assessments.schemas import AssessmentView, ReviewInput, TurnInput


@dataclass
class TurnResult:
    """Výsledek jednoho tahu — nový stav session + co má frontend vykreslit."""

    status: AssessmentSessionStatus
    view: AssessmentView


class BaseAssessmentService(ABC):
    """
    Kontrakt jednoho interakčního formátu.

    Service je bezstavová mezi requesty — veškerý stav žije v DB
    (``session.result``, ``session.settings_snapshot`` a tahy v
    ``assessment_turn``) a při každém volání se z ní rekonstruuje.
    Commit dělá controller, service jen přidává objekty do session.
    """

    #: kód formátu — musí odpovídat assessment_type.code v katalogu
    type_code: ClassVar[str]
    #: Pydantic schéma pro CourseAssessment.settings (validace při konfiguraci)
    settings_schema: ClassVar[type[BaseModel]]

    def __init__(self, db: Session, session: models.AssessmentSession):
        self.db = db
        self.session = session

    # ---------- povinné metody formátu ----------

    @abstractmethod
    async def start(self) -> TurnResult:
        """Inicializuje novou session (výběr tématu, první otázka...)."""

    @abstractmethod
    async def handle_turn(self, turn: TurnInput) -> TurnResult:
        """Zpracuje tah studenta. Na nepodporovaný druh tahu vyhodí ValueError."""

    @abstractmethod
    def current_view(self) -> AssessmentView:
        """Zrekonstruuje aktuální obrazovku z DB (refresh stránky, návrat)."""

    # ---------- volitelné: hodnocení člověkem ----------

    async def handle_review(self, review: ReviewInput) -> TurnResult:
        """Zpracuje hodnocení lektora u session ve stavu awaiting_review.

        Přepisují formáty, které podporují evaluation_mode 'human'
        nebo 'ai_human'. Výchozí implementace hlásí nepodporu.
        """
        raise ValueError(
            f"Formát '{self.type_code}' nepodporuje hodnocení člověkem"
        )

    # ---------- sdílené helpery ----------

    def add_turn(
        self,
        role: AssessmentTurnRole,
        content: str | None = None,
        payload: dict | None = None,
    ) -> models.AssessmentTurn:
        """Přidá tah do session (bez commitu — ten dělá controller)."""
        turn = models.AssessmentTurn(
            session_id=self.session.session_id,
            role=role,
            content=content,
            payload=payload,
        )
        self.db.add(turn)
        return turn

    def update_result(self, **changes) -> dict:
        """
        Aktualizuje session.result NOVÝM dictem.

        JSONB sloupec bez MutableDict nesleduje in-place mutace —
        ``session.result["x"] = 1`` by se tiše neuložilo. Vždy přiřazujeme
        nový objekt.
        """
        new_result = {**(self.session.result or {}), **changes}
        self.session.result = new_result
        return new_result

    @property
    def settings(self) -> BaseModel:
        """Zvalidovaný snapshot nastavení z okamžiku startu session."""
        return self.settings_schema.model_validate(self.session.settings_snapshot)


# ---------- Registr formátů ----------

REGISTRY: dict[str, type[BaseAssessmentService]] = {}


def register(cls: type[BaseAssessmentService]) -> type[BaseAssessmentService]:
    """Class dekorátor — zaregistruje formát do registru podle type_code."""
    if not getattr(cls, "type_code", None):
        raise ValueError(f"{cls.__name__} nemá nastavený type_code")
    if cls.type_code in REGISTRY:
        raise ValueError(f"Formát '{cls.type_code}' je již zaregistrován")
    REGISTRY[cls.type_code] = cls
    return cls


def get_service_class(type_code: str) -> type[BaseAssessmentService]:
    """Vrátí service třídu formátu, nebo vyhodí ValueError (kód bez implementace)."""
    try:
        return REGISTRY[type_code]
    except KeyError:
        raise ValueError(
            f"Interakční formát '{type_code}' nemá implementaci "
            f"(registrované: {sorted(REGISTRY)})"
        ) from None


def validate_settings(type_code: str, settings: dict) -> dict:
    """
    Zvaliduje settings proti Pydantic schématu formátu a vrátí
    normalizovaný dict (doplněné defaulty) k uložení do JSONB.

    Vyhazuje ValueError s čitelnou hláškou pro 400/422 odpověď.
    """
    service_cls = get_service_class(type_code)
    try:
        validated = service_cls.settings_schema.model_validate(settings)
    except ValidationError as e:
        errors = "; ".join(
            f"{'.'.join(str(loc) for loc in err['loc']) or 'settings'}: {err['msg']}"
            for err in e.errors()
        )
        raise ValueError(f"Neplatné nastavení formátu '{type_code}': {errors}") from e
    return validated.model_dump()
