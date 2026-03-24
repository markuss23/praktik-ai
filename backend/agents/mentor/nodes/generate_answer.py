from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.mentor.state import AgentState
from agents.mentor.state import ChunkData

DEFAULT_MODEL = "gpt-5-mini"

DEFAULT_PROMPT = (
    "Jsi AI asistent pro výuku - mentor studenta.\n"
    "Odpovídáš na otázky studenta POUZE na základě poskytnutého kontextu z učebních materiálů.\n\n"
    "PRAVIDLA:\n"
    "- Odpověz výhradně na základě poskytnutého kontextu\n"
    "- Pokud kontext neobsahuje odpověď, řekni to otevřeně\n"
    "- Buď přátelský, trpělivý a pedagogický\n"
    "- Používej příklady z kontextu pro lepší pochopení\n"
    "- Pokud student nerozumí, zkus vysvětlit jinak\n"
    "- Odpovídej vždy v češtině\n"
    "- odpověd maximálně 500 znaků"
)


def generate_answer(state: AgentState) -> AgentState:
    """Uzlu pro generování odpovědi."""
    print("Generuji odpověď...")

    context_chunks: list[ChunkData] = state.get("context_chunks", [])
    user_message: str = state["message"]
    ai_tone: str = state.get("ai_tone", "profesionální a neutrální")
    ai_expression_level: str = state.get(
        "ai_expression_level", "standardní srozumitelný jazyk"
    )
    db = state["db"]

    print(f"Uživatelská otázka: {user_message}")
    print(f"Používám {len(context_chunks)} kontextových chunků pro generování odpovědi")
    if not context_chunks:
        return {
            "answer": "Omlouvám se, ale nenašel jsem relevantní informace k vaší otázce v tomto učebním bloku.",
        }

    # Spojení kontextu z chunků
    context_text = "\n\n---\n\n".join(
        [
            f"[Chunk {idx}]\n{chunk.content}"
            for idx, chunk in enumerate(context_chunks, 1)
        ]
    )

    cfg = get_llm_config(
        db,
        "mentor_answer",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0.7)

    system_prompt = f"""{cfg.prompt}

            STYL KOMUNIKACE:
            - Tón: {ai_tone}
            - Úroveň vyjadřování: {ai_expression_level}
"""

    user_prompt: str = f"""KONTEXT Z UČEBNÍCH MATERIÁLŮ:
                {context_text}

                ---

                OTÁZKA STUDENTA:
                {user_message}

            ---

                Odpověz na otázku studenta na základě výše uvedeného kontextu. Buď konkrétní a pedagogický.
        """

    messages: list[SystemMessage | HumanMessage] = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]

    try:
        response = llm.invoke(messages)
        answer = response.content

        print(f"Odpověď vygenerována ({len(answer)} znaků)")

        return {
            "answer": answer,
        }

    except Exception as e:
        print(f"Chyba při generování odpovědi: {e}")
        return {
            "answer": "Omlouvám se, vyskytla se chyba při generování odpovědi.",
        }
