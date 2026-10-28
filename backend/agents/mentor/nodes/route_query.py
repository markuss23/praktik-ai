import logging
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from agents.base.llm import get_llm_config, create_chat_llm
from agents.mentor.state import AgentState

logger = logging.getLogger(__name__)

PROMPT = (Path(__file__).parent.parent / "router_prompt.md").read_text(encoding="utf-8")
HISTORY_ANSWER_LIMIT = 500


class RouteDecision(BaseModel):
    needs_retrieval: bool = Field(description="Je potřeba dohledat učební materiály?")
    search_query: str = Field(description="Zpráva přepsaná na samostatnou otázku.")


async def route_query(state: AgentState) -> dict:
    """Rozhodne, jestli hledat ve vektorovém úložišti, a přepíše navazující otázku na samostatnou."""
    message = state["message"]
    history = state.get("history") or []

    # Bez historie není co přepisovat ani z čeho odpovědět — hledá se vždy
    if not history:
        return {"needs_retrieval": True, "search_query": message}

    conversation = "\n\n".join(
        f"STUDENT: {question}\nMENTOR: {answer[:HISTORY_ANSWER_LIMIT]}"
        for question, answer in history
    )

    try:
        cfg = get_llm_config(state["db"], "mentor_router")
        llm = create_chat_llm(cfg.model).with_structured_output(
            RouteDecision, method="json_schema"
        )
        decision: RouteDecision = await llm.ainvoke(
            [
                SystemMessage(content=PROMPT),
                HumanMessage(
                    content=f"PŘEDCHOZÍ KONVERZACE:\n{conversation}\n\nNOVÁ ZPRÁVA STUDENTA:\n{message}"
                ),
            ]
        )
    except Exception as e:
        logger.exception(f"Chyba při routování dotazu, hledám: {e}")
        return {"needs_retrieval": True, "search_query": message}

    logger.info(
        f"Router: needs_retrieval={decision.needs_retrieval}, query={decision.search_query!r}"
    )
    return {
        "needs_retrieval": decision.needs_retrieval,
        "search_query": decision.search_query.strip() or message,
    }
