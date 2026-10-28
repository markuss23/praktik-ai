# backend/agents/mentor/nodes/rerank_documents.py
import logging
from pathlib import Path

from langchain_core.messages.ai import AIMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.mentor.state import AgentState, ChunkData

logger = logging.getLogger(__name__)

PROMPT = (Path(__file__).parent.parent / "reranker_prompt.md").read_text(encoding="utf-8")
TOP_K = 5


async def rerank_documents(state: AgentState) -> dict:
    """LLM reranking dokumentů podle relevance k otázce."""
    logger.info("Reranking dokumentů pomocí LLM...")

    context_chunks = state.get("context_chunks", [])
    # Přepsaný dotaz z routeru — u navazující otázky („a proč?“) samotná zpráva nedává smysl
    user_message = state.get("search_query") or state["message"]
    db = state["db"]

    if len(context_chunks) <= TOP_K:
        logger.info("Málo dokumentů, přeskakuji reranking")
        return {}  # Necháme původní pořadí

    cfg = get_llm_config(db, "mentor_reranker")
    llm = create_chat_llm(cfg.model, temperature=0)

    # Vytvoř prompt s dokumenty
    docs_text = "\n\n".join(
        [
            f"[DOC {idx}]\n{chunk.content[:800]}"
            for idx, chunk in enumerate(context_chunks, 1)
        ]
    )

    rerank_prompt = f"""{PROMPT}

            OTÁZKA: {user_message}

            DOKUMENTY:
            {docs_text}"""

    try:
        response: AIMessage = await llm.ainvoke(rerank_prompt)

        # Parse odpovědi — bez duplicit a čísel mimo rozsah
        ranked_indices: list[int] = []
        for x in response.text.split(","):
            idx = int(x) - 1 if x.strip().isdigit() else -1
            if 0 <= idx < len(context_chunks) and idx not in ranked_indices:
                ranked_indices.append(idx)

        # Doplní z původního pořadí, když LLM vrátí méně než TOP_K
        for idx in range(len(context_chunks)):
            if len(ranked_indices) >= TOP_K:
                break
            if idx not in ranked_indices:
                ranked_indices.append(idx)

        reranked_chunks: list[ChunkData] = [
            context_chunks[idx] for idx in ranked_indices[:TOP_K]
        ]

        logger.debug(f"Reranking: {[i + 1 for i in ranked_indices[:TOP_K]]}")
        logger.info(f"Vybráno {len(reranked_chunks)} top dokumentů")

        return {"context_chunks": reranked_chunks}

    except Exception as e:
        logger.exception(f"Chyba při rerankingu: {e}")
        # Fallback: vrať TOP_K z původních
        return {"context_chunks": context_chunks[:TOP_K]}
