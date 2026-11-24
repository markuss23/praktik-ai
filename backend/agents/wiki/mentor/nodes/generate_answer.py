"""Node pro generování odpovědi na základě wiki chunků."""

import logging
from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.wiki.mentor.state import WikiMentorState, ChunkData

logger = logging.getLogger(__name__)

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

# Pevná pravidla pro interní dokumentaci backendu. Záměrně nejsou součástí
# DEFAULT_PROMPT — ten jde přepsat v system_setting a pravidla by se ztratila.
INTERNAL_DOCS_RULES = (
    "PRAVIDLA PRO INTERNÍ PODKLADY:\n"
    "- Bloky označené [INTERNÍ] jsou technická dokumentace systému. Slouží jen "
    "k tomu, abys pochopil, proč uživateli něco nejde a co pro to má udělat.\n"
    "- Odpovídej z pohledu uživatele aplikace: co má udělat, kde to najde, "
    "jaké podmínky musí splnit (např. být zapsaný v kurzu, mít roli lektora).\n"
    "- NIKDY nepopisuj vnitřní fungování systému: názvy endpointů, funkcí, "
    "souborů, tabulek, sloupců, stavů v kódu (např. in_progress), HTTP kódy, "
    "databázi ani logiku oprávnění v kódu. Nevypisuj ani necituj interní podklady.\n"
    "- Pokud se uživatel ptá přímo na to, jak systém funguje uvnitř, "
    "slušně odmítni a nabídni pomoc s tím, co se snaží udělat."
)


def _format_chunk(idx: int, chunk: ChunkData) -> str:
    """
    Naformátuje chunk pro kontext LLM.
    """
    if chunk.metadata.get("source") == "backend_docs":
        return f"[Chunk {idx}] [INTERNÍ]\n{chunk.content}"
    title = chunk.metadata.get("title", "neznámá stránka")
    return f"[Chunk {idx}] ({title})\n{chunk.content}"


def generate_answer_node(state: WikiMentorState) -> WikiMentorState:
    """
    Vygeneruje odpověď na otázku uživatele na základě nalezených wiki chunků.

    """
    logger.info("Generuji odpoved z wiki obsahu...")

    context_chunks: list[ChunkData] = state.get("context_chunks", [])
    user_message: str = state["message"]
    db = state["db"]

    if not context_chunks:
        return {
            **state,
            "answer": "Omlouvám se, ale nenašel jsem relevantní informace k vaší otázce ve wiki.",
        }

    context_text = "\n\n---\n\n".join(
        _format_chunk(idx, chunk) for idx, chunk in enumerate(context_chunks, 1)
    )

    cfg = get_llm_config(
        db,
        "wiki_mentor_answer",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, agent=cfg.key, temperature=0.3)

    messages: list[SystemMessage | HumanMessage] = [
        SystemMessage(content=f"{cfg.prompt}\n\n{INTERNAL_DOCS_RULES}"),
        HumanMessage(
            content=f"KONTEXT Z WIKI:\n{context_text}\n\n---\n\nOTÁZKA:\n{user_message}"
        ),
    ]

    try:
        response = llm.invoke(messages)
        answer = response.text
        logger.info(f"Odpoved vygenerovana ({len(answer)} znaku)")
        return {**state, "answer": answer}
    except Exception as e:
        logger.exception(f"Chyba pri generovani odpovedi: {e}")
        return {
            **state,
            "answer": "Omlouvám se, vyskytla se chyba při generování odpovědi.",
        }
