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
    default_model: str | None = None,
    default_prompt: str | None = None,
) -> LLMConfig:
    """Načte SystemSetting podle klíče. Pokud neexistuje a nejsou defaulty, vyhodí chybu."""
    row = db.execute(
        select(SystemSetting).where(
            SystemSetting.key == key,
            SystemSetting.is_active == text("true"),
        )
    ).scalar_one_or_none()

    if row is None:
        if default_model is None or default_prompt is None:
            raise ValueError(
                f"SystemSetting '{key}' nebyl nalezen v databázi a není nastaven výchozí prompt/model."
            )
        return LLMConfig(model=default_model, prompt=default_prompt)

    return LLMConfig(
        model=row.model,
        prompt=row.prompt,
    )


DEFAULT_ANTHROPIC_MAX_TOKENS = 16000


def create_chat_llm(
    model: str,
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> BaseChatModel:
    """Vytvoří ChatOpenAI nebo ChatAnthropic podle prefixu názvu modelu."""
    kwargs: dict = {}

    if model.startswith("claude"):
        # Aktuální generace Claude modelů (Opus 5, Sonnet 5, Fable 5/5.1, ...)
        # parametr temperature nepodporuje a vrací 400 Bad Request –
        # na rozdíl od staršího Claude 4.6 a dřívějších modelů, kde byl
        # povolený. Proto se u Claude modelů nikdy nepředává.
        # langchain-anthropic odvozuje výchozí max_tokens z interní tabulky
        # model profilů. Nové modely (např. claude-opus-5) v ní nemusí být,
        # což tiše spadne na fallback 4096 tokenů a u strukturovaného
        # výstupu (moduly kurzu) to způsobí uříznutí odpovědi na půli.
        # Proto max_tokens vždy nastavujeme explicitně.
        resolved_max_tokens = max_tokens or DEFAULT_ANTHROPIC_MAX_TOKENS
        kwargs["max_tokens"] = resolved_max_tokens
        # Nad ~16k tokenů hrozí u nestreamovaného requestu vypršení
        # HTTP timeoutu, než model dokončí generování.
        if resolved_max_tokens > DEFAULT_ANTHROPIC_MAX_TOKENS:
            kwargs["streaming"] = True
        return ChatAnthropic(model_name=model, **kwargs)

    if temperature is not None:
        kwargs["temperature"] = temperature

    return ChatOpenAI(model=model, **kwargs)
