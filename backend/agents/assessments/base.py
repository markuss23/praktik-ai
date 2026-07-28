"""
Základní nástroje a registr interakčních formátů (assessments).

Žádné třídy ani dědičnost. Formát = obyčejný Python modul (viz
``closed_questions/service.py``) se třemi funkcemi:

    def start(db, session) -> TurnResult: ...
    def handle_turn(db, session, turn) -> TurnResult: ...
    def current_view(session) -> AssessmentView: ...

Tenhle soubor drží:
  - ``TurnResult`` — datová krabička, co se vrací z ``start``/``handle_turn``.
  - tři sdílené pomocné funkce, které formát může (ale nemusí) použít.
  - ``REGISTRY`` — obyčejný dict {kód formátu: {funkce a schéma formátu}}.
    Vyplňuje se ručně v ``agents/assessments/__init__.py`` — žádná
    automatická registrace, žádná magie. Nový formát = nový řádek v tom
    dictu.
"""

from dataclasses import dataclass

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from api import models
from api.enums import AssessmentSessionStatus, AssessmentTurnRole
from agents.assessments.schemas import AssessmentView


@dataclass
class TurnResult:
    """Výsledek jednoho tahu — nový stav session + co má frontend vykreslit."""

    status: AssessmentSessionStatus
    view: AssessmentView


# ---------- Sdílené pomocné funkce ----------
#
# Formát je bezstavový mezi requesty — veškerý stav žije v DB
# (``session.result``, ``session.settings_snapshot`` a tahy v
# ``assessment_turn``) a při každém volání se z ní znovu přečte.
# Commit dělá vždy controller (api/src/assessments/controllers.py),
# tyhle funkce jen připraví/upraví objekty v paměti.


def add_turn(
    db: Session,
    session: models.AssessmentSession,
    role: AssessmentTurnRole,
    content: str | None = None,
    payload: dict | None = None,
) -> models.AssessmentTurn:
    """Přidá tah do session (bez commitu — ten dělá controller)."""
    turn = models.AssessmentTurn(
        session_id=session.session_id,
        role=role,
        content=content,
        payload=payload,
    )
    db.add(turn)
    return turn


def update_result(session: models.AssessmentSession, **changes) -> dict:
    """
    Aktualizuje session.result NOVÝM dictem.

    JSONB sloupec bez MutableDict nesleduje in-place mutace —
    ``session.result["x"] = 1`` by se tiše neuložilo. Vždy přiřazujeme
    nový objekt.
    """
    new_result = {**(session.result or {}), **changes}
    session.result = new_result
    return new_result


def get_settings(
    session: models.AssessmentSession, settings_schema: type[BaseModel]
) -> BaseModel:
    """Zvalidovaný snapshot nastavení z okamžiku startu session."""
    return settings_schema.model_validate(session.settings_snapshot)


# ---------- Registr formátů ----------
#
# Klíč = assessment_type.code z katalogu. Hodnota = dict se čtyřmi věcmi:
# Pydantic schéma nastavení + tři funkce formátu.

REGISTRY: dict[str, dict] = {}


def get_format(type_code: str) -> dict:
    """Vrátí dict formátu z registru, nebo vyhodí ValueError (kód bez implementace)."""
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
    fmt = get_format(type_code)
    try:
        validated = fmt["settings_schema"].model_validate(settings)
    except ValidationError as e:
        errors = "; ".join(
            f"{'.'.join(str(loc) for loc in err['loc']) or 'settings'}: {err['msg']}"
            for err in e.errors()
        )
        raise ValueError(f"Neplatné nastavení formátu '{type_code}': {errors}") from e
    return validated.model_dump()
