import logging
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.mentor.state import AgentState
from agents.mentor.state import ChunkData

logger = logging.getLogger(__name__)

PROMPT = (Path(__file__).parent.parent / "prompt.md").read_text(encoding="utf-8")

# Maximální délka odpovědi podle osy Informační hustota (číselník AI stylu)
ANSWER_LENGTH = {"dens.low": 250, "dens.med": 500, "dens.high": 1000}
DEFAULT_ANSWER_LENGTH = 500
FALLBACK_CONTENT_LIMIT = 4000


async def generate_answer(state: AgentState) -> AgentState:
    """Uzlu pro generování odpovědi."""
    logger.info("Generuji odpověď...")

    context_chunks: list[ChunkData] = state.get("context_chunks", [])
    user_message: str = state["message"]
    ai_style: str = state.get("ai_style", "")
    history: list[tuple[str, str]] = state.get("history", [])
    max_length = next(
        (ANSWER_LENGTH[c] for c in state.get("ai_style_codes", []) if c in ANSWER_LENGTH),
        DEFAULT_ANSWER_LENGTH,
    )
    db = state["db"]

    logger.debug(f"Uživatelská otázka: {user_message}")
    logger.info(f"Používám {len(context_chunks)} kontextových chunků pro generování odpovědi")

    if context_chunks:
        context_text = "\n\n---\n\n".join(
            [
                f"[Chunk {idx}]\n{chunk.content}"
                for idx, chunk in enumerate(context_chunks, 1)
            ]
        )
    elif state.get("learn_block_content"):
        # Vyhledávání nic nenašlo nebo ho router přeskočil — kontextem je přímo text učebního bloku
        context_text = state["learn_block_content"][:FALLBACK_CONTENT_LIMIT]
    elif history and not state.get("needs_retrieval", True):
        # Router usoudil, že stačí předchozí konverzace
        context_text = "Nové materiály nejsou potřeba — odpověz z předchozí konverzace."
    else:
        return {
            "answer": "Omlouvám se, ale nenašel jsem relevantní informace k vaší otázce v tomto učebním bloku.",
        }

    cfg = get_llm_config(db, "mentor_answer")
    llm = create_chat_llm(cfg.model, temperature=0.7)

    system_prompt = f"""{PROMPT.rstrip()}
- Odpověď maximálně {max_length} znaků (počítá se text bez HTML tagů)

STUDENT PRÁVĚ STUDUJE:
- Kurz: {state.get("course_title", "")}
- Modul: {state.get("module_title", "")}
- Učební blok: {state.get("learn_block_title", "")}

STYL KOMUNIKACE (zvolil si ho student, dodržuj ho přednostně):
{ai_style}
"""

    user_prompt: str = f"""KONTEXT Z UČEBNÍCH MATERIÁLŮ:
{context_text}

---

OTÁZKA STUDENTA:
{user_message}

---

Odpověz na otázku studenta na základě výše uvedeného kontextu.
"""

    messages: list[SystemMessage | HumanMessage | AIMessage] = [
        SystemMessage(content=system_prompt),
    ]
    for question, answer in history:
        messages += [HumanMessage(content=question), AIMessage(content=answer)]
    messages.append(HumanMessage(content=user_prompt))

    try:
        response = await llm.ainvoke(messages)
        answer = response.text

        logger.info(f"Odpověď vygenerována ({len(answer)} znaků)")

        return {
            "answer": answer,
        }

    except Exception as e:
        logger.exception(f"Chyba při generování odpovědi: {e}")
        return {
            "answer": "Omlouvám se, vyskytla se chyba při generování odpovědi.",
        }
