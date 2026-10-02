from agents.base.llm import get_llm_config, create_chat_llm
from agents.course_generator.input_block import build_input_block
from agents.course_generator.state import AgentState, CourseGenerated, CourseInput
from api.src.agents.progress import set_progress


def plan_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření modulů kurzu."""
    print("Generání modulů kurzu...")

    course_id = state.get("course_id")
    if course_id is not None:
        set_progress(course_id, step=4, label="Plánování modulů (AI)")

    course_input: CourseInput | None = state.get("course_input")
    summarize_content: str = state.get("summarize_content", "")
    db = state["db"]

    if course_input is None:
        raise ValueError("course_input is not available in state")

    cfg = get_llm_config(db, "course_planner")
    model = create_chat_llm(cfg.model, max_tokens=64000)
    # method="json_schema" použije nativní strukturované výstupy Anthropic
    # (server-side vynucené schéma), místo pouhého tool-callingu – ten model
    # jen "navádí" a u složitě zanořených schémat (moduly -> learn_blocks/
    # practice_questions) mohl vrátit zanořené pole jako JSON string.
    llm_structured = model.with_structured_output(CourseGenerated, method="json_schema")

    prompt = f"""{cfg.prompt}

{build_input_block(course_input)}

SOUHRN:
{summarize_content}"""

    output: CourseGenerated = llm_structured.invoke(prompt)

    if not output.modules:
        raise ValueError(
            "LLM vrátil kurz bez modulů. Zkontroluj limit max_tokens a nastavení modelu."
        )

    state["course"] = output

    print(f"   -> Vytvořen kurz: {output.title}")
    print(f"   -> Počet modulů: {len(output.modules)}")

    return state
