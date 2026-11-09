"""
Počítání AI tokenů. Každé LLM volání z create_chat_llm zapíše spotřebu do ai_usage.
Volání mimo LangChain zapisují přes record_usage.

Komu se tokeny připíšou, určuje ContextVar nastavený dependency ai_budget
na začátku requestu. Background tasky (asyncio.create_task) ho zdědí.
"""

from contextvars import ContextVar
from dataclasses import dataclass

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult


@dataclass(frozen=True)
class UsageContext:
    user_id: int | None
    endpoint: str | None


usage_context: ContextVar[UsageContext | None] = ContextVar(
    "ai_usage_context", default=None
)


class UsageCallback(BaseCallbackHandler):
    """Po každém LLM volání uloží do ai_usage tokeny, agenta a cenu."""

    def __init__(self, model: str, agent: str | None = None) -> None:
        self.model = model
        self.agent = agent

    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        input_tokens = output_tokens = cache_read_tokens = 0
        for generations in response.generations:
            for generation in generations:
                message = getattr(generation, "message", None)
                usage = getattr(message, "usage_metadata", None) or {}
                input_tokens += usage.get("input_tokens", 0)
                output_tokens += usage.get("output_tokens", 0)
                details = usage.get("input_token_details") or {}
                cache_read_tokens += details.get("cache_read") or 0
        record_usage(
            self.model,
            input_tokens,
            output_tokens,
            agent=self.agent,
            cache_read_tokens=cache_read_tokens,
        )


def record_usage(
    model: str,
    input_tokens: int,
    output_tokens: int,
    *,
    agent: str | None = None,
    cache_read_tokens: int = 0,
) -> None:
    """Zapíše jedno AI volání do ai_usage pro uživatele z usage_context. Nuly nezapisuje.

    Používá ho UsageCallback a volání mimo LangChain (např. TTS podcastu přes
    OpenAI SDK). Cenu spočítá podle ai_model_price.

    """
    if not input_tokens and not output_tokens:
        return

    # Lazy import — modul se načítá i tam, kde DB není (testy agentů)
    from agents.base.pricing import compute_cost
    from api.database import SessionLocal
    from api.models import AiUsage

    ctx = usage_context.get() or UsageContext(user_id=None, endpoint=None)
    with SessionLocal() as db:
        cost = compute_cost(db, model, input_tokens, output_tokens, cache_read_tokens)
        db.add(
            AiUsage(
                user_id=ctx.user_id,
                endpoint=ctx.endpoint,
                agent=agent,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost=cost,
            )
        )
        db.commit()
