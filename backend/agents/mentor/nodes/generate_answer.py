from langchain_openai import ChatOpenAI
from agents.mentor.state import AgentState
from agents.mentor.state import ChunkData
from langchain_core.messages import HumanMessage, SystemMessage


def generate_answer(state: AgentState) -> AgentState:
    """Uzlu pro generování odpovědi."""
    print("Generuji odpověď...")

    context_chunks: list[ChunkData] = state.get("context_chunks", [])
    user_message: str = state["message"]

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

    llm = ChatOpenAI(model="gpt-5-mini", temperature=0.7)

    system_prompt = """Jsi AI asistent pro výuku - mentor studenta. 
            Odpovídáš na otázky studenta POUZE na základě poskytnutého kontextu z učebních materiálů.

            PRAVIDLA:
            - Odpověz výhradně na základě poskytnutého kontextu
            - Pokud kontext neobsahuje odpověď, řekni to otevřeně
            - Buď přátelský, trpělivý a pedagogický
            - Používej příklady z kontextu pro lepší pochopení
            - Pokud student nerozumí, zkus vysvětlit jinak
            - Odpovídej vždy v češtině
            - odpověd maximálně 500 znaků
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
