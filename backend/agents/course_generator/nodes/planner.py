from langchain_openai import ChatOpenAI

from agents.course_generator.state import AgentState, Course
from agents.course_generator.state import CourseInput


def plan_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření modulů kurzu."""
    print("Generání modulů kurzu...")

    course_input: CourseInput | None = state.get("course_input")
    summarize_content: str = state.get("summarize_content", "")

    if course_input is None:
        raise ValueError("course_input is not available in state")

    model = ChatOpenAI(model="gpt-4o-mini")
    llm_structured = model.with_structured_output(Course)

    modules_count = course_input.modules_count
    title = course_input.title
    description = course_input.description or ""

    prompt = f"""Na základě následujícího obsahu vytvoř strukturovaný vzdělávací kurz.

NÁZEV KURZU: {title}
POPIS KURZU: {description}

OBSAH K ZPRACOVÁNÍ:
{summarize_content}

INSTRUKCE:
1. Použij název kurzu: "{title}"
2. Rozděl obsah do přesně {modules_count} logických modulů
3. Pro každý modul vytvoř následující strukturu:
   - Výstižný název modulu
   - Krátký popis o čem modul je (2-3 věty)
   - V sekci "learn" napiš kompletní látku, kterou se uživatel musí naučit (detailní vysvětlení tématu)
   - V sekci "practice" vytvoř přesně 2 uzavřené otázky ABC:
     * Každá otázka má 3 možnosti odpovědí (A, B, C)
     * Uveď správnou odpověď
     * Otázky musí ověřovat pochopení látky z learn sekce

Vytvoř kurz v českém jazyce."""

    output: Course = llm_structured.invoke(prompt)

    state["course"] = output

    print(f"   -> Vytvořen kurz: {output.title}")
    print(f"   -> Počet modulů: {len(output.modules)}")

    return state
