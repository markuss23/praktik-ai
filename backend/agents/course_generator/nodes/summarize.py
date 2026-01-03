from langchain_core.messages.ai import AIMessage
from langchain_openai import ChatOpenAI
from sqlalchemy import update

from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput
from api import models


def summarize_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření sumarizaci kurzu."""
    print("Generání sumarizace kurzu...")

    course_input: CourseInput | None = state.get("course_input")
    source_content = state.get("source_content", "")
    course_id = state.get("course_id")

    if course_input is None:
        raise ValueError("course_input is not available in state")

    if course_id is None:
        raise ValueError("course_id is not available in state")

    model = ChatOpenAI(model="gpt-4o-mini")

    modules_count = course_input.modules_count

    prompt: str = f"""Analyzuj následující obsah a vytvoř strukturovaný souhrn optimalizovaný pro vytvoření vzdělávacího kurzu.

                KURZ: {course_input.title}
                POPIS: {course_input.description}
                POČET MODULŮ: {modules_count}

                ZDROJOVÝ OBSAH:
                {source_content}

                INSTRUKCE:
                1. Identifikuj {modules_count} hlavních tematických celků, které lze rozdělit do samostatných modulů
                2. Pro každý tematický celek extrahuj:
                - Klíčové koncepty a pojmy k naučení
                - Praktické příklady a ukázky
                - Fakta vhodná pro testové otázky (ABC)

                3. Výstup strukturuj takto:
                
                TÉMA 1: [název tématu]
                - Klíčové koncepty: [seznam pojmů a definic]
                - Látka k naučení: [detailní vysvětlení]
                - Testovatelná fakta: [konkrétní informace pro otázky]

                TÉMA 2: [název tématu]
                ...

                4. Zachovej odbornou terminologii a přesné definice
                5. Maximální délka: 4000 znaků
                6. Piš v češtině, bez markdown formátování"""

    output: AIMessage = model.invoke(prompt)

    # Uložení summary do DB
    db = state.get("db")
    if db:
        stmt = (
            update(models.Course)
            .where(models.Course.course_id == course_id)
            .values(summary=output.content)
        )
        db.execute(stmt)
        db.commit()
        print("   -> Summary uloženo do databáze")

    state["summarize_content"] = output.content
    print(f"   -> Vytvořen souhrn obsahu kurzu (délka {len(output.content)} znaků)")
    print(f"   -> Náhled souhrnu: {output.content[:200]}...")

    return state
