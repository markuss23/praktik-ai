"""
Utility pro načtení LLM konfigurace z SystemSetting a vytvoření
odpovídající ChatModel instance (OpenAI / Anthropic).
"""

from dataclasses import dataclass

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from api.models import SystemSetting


@dataclass(frozen=True)
class LLMConfig:
    """Načtená konfigurace z DB (nebo fallback default)."""

    model: str
    prompt: str


def get_llm_config(
    db: Session,
    key: str,
    *,
    default_model: str,
    default_prompt: str,
) -> LLMConfig:
    """Načte SystemSetting podle klíče. Pokud neexistuje, vrátí default."""
    row = db.execute(
        select(SystemSetting).where(
            SystemSetting.key == key,
            SystemSetting.is_active == text("true"),
        )
    ).scalar_one_or_none()
    
    if row is None:
        return LLMConfig(model=default_model, prompt=default_prompt)

    return LLMConfig(
        model=row.model,
        prompt=row.prompt,
    )


def create_chat_llm(
    model: str,
    *,
    temperature: float | None = None,
) -> BaseChatModel:
    """Vytvoří ChatOpenAI nebo ChatAnthropic podle prefixu názvu modelu."""
    kwargs: dict = {}
    if temperature is not None:
        kwargs["temperature"] = temperature

    if model.startswith("claude"):
        return ChatAnthropic(model_name=model, **kwargs)

    return ChatOpenAI(model=model, **kwargs)
