from langchain_core.messages.ai import AIMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput
from api.src.agents.progress import set_progress


def summarize_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření sumarizaci kurzu."""
    print("Generání sumarizace kurzu...")

    course_input: CourseInput | None = state.get("course_input")
    source_content = state.get("source_content", "")
    course_id = state.get("course_id")
    db = state["db"]

    if course_id is not None:
        set_progress(course_id, step=3, label="Zpracování podkladů (AI)")

    if course_input is None:
        raise ValueError("course_input is not available in state")

    if course_id is None:
        raise ValueError("course_id is not available in state")

    cfg = get_llm_config(db, "course_summarizer")
    model = create_chat_llm(cfg.model)

    modules_count = course_input.modules_count_ai_generated
    duration_minutes = course_input.duration_minutes
    duration_info = f"{duration_minutes} minut" if duration_minutes is not None else "neurčena"

    prompt: str = f"""{cfg.prompt}

                KURZ: {course_input.title}
                POPIS: {course_input.description}
                POČET MODULŮ: {modules_count}
                DÉLKA KURZU: {duration_info}

                ZDROJOVÝ OBSAH:
                {source_content}"""

    output: AIMessage = model.invoke(prompt)

    if not output.content.strip():
        raise ValueError(
            "LLM vrátil prázdnou sumarizaci. Zkontroluj zdrojový obsah a nastavení modelu."
        )

    state["summarize_content"] = output.content
    print(f"   -> Vytvořen souhrn obsahu kurzu (délka {len(output.content)} znaků)")
    print(f"   -> Náhled souhrnu: {output.content[:200]}...")

    return state
