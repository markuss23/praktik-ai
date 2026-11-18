"""
Výpočet ceny jednoho LLM volání podle ceníku v tabulce ai_model_price
(USD za 1M tokenů).

Cena se počítá v UsageCallback při zápisu a ukládá do ai_usage.cost, takže
pozdější změna ceníku nepřepíše historii. 
Model, který v ceníku chybí, dostane cost = NULL (cena neznámá), ne 0.
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

CURRENCY = "USD"

_PER_TOKEN = Decimal(1_000_000)


def compute_cost(
    db: Session,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
) -> Decimal | None:
    """
    Spočítá cenu jednoho LLM volání podle ceníku v tabulce ai_model_price.

    """
    from api.models import AiModelPrice

    price = db.scalars(
        select(AiModelPrice).where(
            AiModelPrice.model == model, AiModelPrice.is_active.is_(True)
        )
    ).first()
    if price is None:
        return None

    cached = (
        min(cache_read_tokens, input_tokens)
        if price.cache_read_price is not None
        else 0
    )
    cost = (
        (input_tokens - cached) * price.input_price
        + cached * (price.cache_read_price or Decimal(0))
        + output_tokens * price.output_price
    ) / _PER_TOKEN
    return cost.quantize(Decimal("0.000001"))
