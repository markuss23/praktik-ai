from agents.base.llm import get_llm_config, create_chat_llm
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
    model = create_chat_llm(cfg.model)
    llm_structured = model.with_structured_output(CourseGenerated)

    modules_count = course_input.modules_count_ai_generated
    title = course_input.title
    description = course_input.description or ""
    duration_minutes = course_input.duration_minutes

    if duration_minutes is not None and modules_count > 0:
        minutes_per_module = round(duration_minutes / modules_count)
        duration_info = f"{duration_minutes} minut"
        module_duration_info = f"{minutes_per_module} min/modul"
    else:
        duration_info = "neurčena"
        module_duration_info = "neurčena"

    prompt = f"""{cfg.prompt}

NÁZEV KURZU: {title}
POPIS KURZU: {description}
POČET MODULŮ: {modules_count}
DÉLKA KURZU: {duration_info}
DÉLKA NA MODUL: {module_duration_info}

OBSAH K ZPRACOVÁNÍ:
{summarize_content}"""

    output: CourseGenerated = llm_structured.invoke(prompt)

    state["course"] = output

    print(f"   -> Vytvořen kurz: {output.title}")
    print(f"   -> Počet modulů: {len(output.modules)}")

    return state
