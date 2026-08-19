from pydantic import ValidationError

from api.src.marek_assessment.closed_questions.settings import ClosedQuestionsSettings

REGISTRY: dict[str, dict] = {
    "closed_questions": {
        "settings_schema": ClosedQuestionsSettings,
    },
}


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
