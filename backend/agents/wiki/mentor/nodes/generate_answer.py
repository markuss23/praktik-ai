"""Node pro generování odpovědi na základě wiki chunků."""

from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.wiki.mentor.state import WikiMentorState, ChunkData

DEFAULT_MODEL = "gpt-4o-mini"

DEFAULT_PROMPT = (
    "Jsi asistent, který odpovídá na otázky o projektu POUZE na základě "
    "poskytnutého kontextu z projektové wiki.\n\n"
    "PRAVIDLA:\n"
    "- Odpověz výhradně na základě poskytnutého kontextu\n"
    "- Pokud kontext neobsahuje odpověď, řekni to otevřeně\n"
    "- Odpovídej vždy v češtině\n"
    "- Buď stručný a konkrétní"
)


def generate_answer_node(state: WikiMentorState) -> WikiMentorState:
    """
    Vygeneruje odpověď na otázku uživatele na základě nalezených wiki chunků.

    """
    print("Generuji odpoved z wiki obsahu...")

    context_chunks: list[ChunkData] = state.get("context_chunks", [])
    user_message: str = state["message"]
    db = state["db"]

    if not context_chunks:
        return {
            **state,
            "answer": "Omlouvám se, ale nenašel jsem relevantní informace k vaší otázce ve wiki.",
        }

    context_text = "\n\n---\n\n".join(
        f"[Chunk {idx}] ({chunk.metadata.get('title', 'neznámá stránka')})\n{chunk.content}"
        for idx, chunk in enumerate(context_chunks, 1)
    )

    cfg = get_llm_config(
        db,
        "wiki_mentor_answer",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0.3)

    messages: list[SystemMessage | HumanMessage] = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(
            content=f"KONTEXT Z WIKI:\n{context_text}\n\n---\n\nOTÁZKA:\n{user_message}"
        ),
    ]

    try:
        response = llm.invoke(messages)
        answer = response.content
        print(f"Odpoved vygenerovana ({len(answer)} znaku)")
        return {**state, "answer": answer}
    except Exception as e:
        print(f"Chyba pri generovani odpovedi: {e}")
        return {
            **state,
            "answer": "Omlouvám se, vyskytla se chyba při generování odpovědi.",
        }
