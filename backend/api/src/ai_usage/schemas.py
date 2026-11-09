from decimal import Decimal

from pydantic import BaseModel


class AiUsageTotals(BaseModel):
    """Součet spotřeby za vybrané období.

    cost je součet jen ocenitelných volání; unpriced_calls říká, kolik volání
    cenu nemá (model není v ceníku nebo jde o řádky z doby před ceníkem).
    """

    input_tokens: int
    output_tokens: int
    total_tokens: int
    calls: int
    cost: Decimal | None
    unpriced_calls: int


class AiUsageItem(AiUsageTotals):
    """Spotřeba jedné kombinace agent + služba (šablona endpointu bez ID) + model."""

    agent: str | None
    endpoint: str | None
    model: str


class AiUsageSummary(BaseModel):
    """Celkový souhrn a rozpad spotřeby podle agenta, služby a modelu."""

    user_id: int | None
    currency: str
    total: AiUsageTotals
    items: list[AiUsageItem]
