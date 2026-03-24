# backend/agents/mentor/nodes/rerank_documents.py
from langchain_core.messages.ai import AIMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.mentor.state import AgentState, ChunkData

DEFAULT_MODEL = "gpt-4o-mini"

DEFAULT_PROMPT = (
    "Máš seznam dokumentů a otázku uživatele.\n"
    "Seřaď dokumenty podle relevance k otázce (nejrelevantnější první).\n\n"
    "Vrať POUZE čísla dokumentů seřazená od nejrelevantnějšího "
    "(např: 3, 7, 1, 5).\n"
    "Odpověz pouze čísly oddělenými čárkami, nic dalšího."
)


def rerank_documents(state: AgentState) -> dict:
    """LLM reranking dokumentů podle relevance k otázce."""
    print("Reranking dokumentů pomocí LLM...")

    context_chunks = state.get("context_chunks", [])
    user_message = state["message"]
    db = state["db"]

    if len(context_chunks) <= 3:
        print("Málo dokumentů, přeskakuji reranking")
        return {}  # Necháme původní pořadí

    cfg = get_llm_config(
        db,
        "mentor_reranker",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0)

    # Vytvoř prompt s dokumenty
    docs_text = "\n\n".join(
        [
            f"[DOC {idx}]\n{chunk.content[:400]}"
            for idx, chunk in enumerate(context_chunks, 1)
        ]
    )

    rerank_prompt = f"""{cfg.prompt}

            OTÁZKA: {user_message}

            DOKUMENTY:
            {docs_text}"""

    try:
        response: AIMessage = llm.invoke(rerank_prompt)

        # Parse odpovědi
        ranked_indices: list[int] = [
            int(x.strip()) - 1  # Convert to 0-based
            for x in response.content.strip().split(",")
            if x.strip().isdigit()
        ]

        # Vyber top 3
        reranked_chunks: list[ChunkData] = [
            context_chunks[idx]
            for idx in ranked_indices[:3]
            if 0 <= idx < len(context_chunks)
        ]

        print(f"Reranking: {[i + 1 for i in ranked_indices[:3]]}")
        print(f"Vybráno {len(reranked_chunks)} top dokumentů")

        return {"context_chunks": reranked_chunks}

    except Exception as e:
        print(f"Chyba při rerankingu: {e}")
        # Fallback: vrať top 3 z původních
        return {"context_chunks": context_chunks[:3]}
