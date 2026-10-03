from langchain_core.messages.ai import AIMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.course_generator.input_block import build_input_block
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
    # Souhrn má ~7 000 znaků na téma; u kurzů s mnoha moduly by výchozích
    # 16k tokenů nestačilo a souhrn by se tiše uřízl (chyběla by poslední témata).
    model = create_chat_llm(cfg.model, max_tokens=32000)

    prompt: str = f"""{cfg.prompt}

{build_input_block(course_input, include_summary_limit=True)}

ZDROJOVÝ OBSAH:
{source_content}"""

    output: AIMessage = model.invoke(prompt)
    summary = output.text

    if not summary.strip():
        raise ValueError(
            "LLM vrátil prázdnou sumarizaci. Zkontroluj zdrojový obsah a nastavení modelu."
        )

    state["summarize_content"] = summary
    print(f"   -> Vytvořen souhrn obsahu kurzu (délka {len(summary)} znaků)")
    print(f"   -> Náhled souhrnu: {summary[:200]}...")

    return state
