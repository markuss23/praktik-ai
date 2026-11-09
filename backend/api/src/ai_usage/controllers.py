from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from agents.base.pricing import CURRENCY
from api import models
from api.src.ai_usage.schemas import AiUsageItem, AiUsageSummary, AiUsageTotals

# Číselná ID v cestě nahradí za {id}, aby se např. /courses/12/... a /courses/13/...sečetly jako jedna služba
_endpoint_template = func.regexp_replace(
    models.AiUsage.endpoint, r"/\d+", "/{id}", "g"
).label("endpoint")


def get_ai_usage_summary(
    db: Session,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> AiUsageSummary:
    """
    Sečte spotřebu AI tokenů a cenu z ai_usage a rozdělí ji podle agenta, služby a modelu.

    """
    input_sum = func.coalesce(func.sum(models.AiUsage.input_tokens), 0)
    output_sum = func.coalesce(func.sum(models.AiUsage.output_tokens), 0)

    stm = select(
        models.AiUsage.agent,
        _endpoint_template,
        models.AiUsage.model,
        input_sum.label("input_tokens"),
        output_sum.label("output_tokens"),
        func.count().label("calls"),
        # SUM ignoruje NULL → součet jen oceněných volání; NULL, pokud žádné není
        func.sum(models.AiUsage.cost).label("cost"),
        func.count().filter(models.AiUsage.cost.is_(None)).label("unpriced_calls"),
    )
    if user_id is not None:
        stm = stm.where(models.AiUsage.user_id == user_id)
    if date_from is not None:
        stm = stm.where(models.AiUsage.created_at >= date_from)
    if date_to is not None:
        stm = stm.where(models.AiUsage.created_at < date_to)
    stm = stm.group_by(
        models.AiUsage.agent, _endpoint_template, models.AiUsage.model
    ).order_by((input_sum + output_sum).desc())

    items = [
        AiUsageItem(
            agent=row.agent,
            endpoint=row.endpoint,
            model=row.model,
            input_tokens=row.input_tokens,
            output_tokens=row.output_tokens,
            total_tokens=row.input_tokens + row.output_tokens,
            calls=row.calls,
            cost=row.cost,
            unpriced_calls=row.unpriced_calls,
        )
        for row in db.execute(stm)
    ]

    total_input = sum(item.input_tokens for item in items)
    total_output = sum(item.output_tokens for item in items)
    priced = [item.cost for item in items if item.cost is not None]
    return AiUsageSummary(
        user_id=user_id,
        currency=CURRENCY,
        total=AiUsageTotals(
            input_tokens=total_input,
            output_tokens=total_output,
            total_tokens=total_input + total_output,
            calls=sum(item.calls for item in items),
            cost=sum(priced) if priced else None,
            unpriced_calls=sum(item.unpriced_calls for item in items),
        ),
        items=items,
    )
