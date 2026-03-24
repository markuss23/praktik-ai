from agents.base.llm import get_llm_config, create_chat_llm
from agents.course_generator.state import AgentState, CourseGenerated, CourseInput

DEFAULT_MODEL = "gpt-5.4"

DEFAULT_PROMPT = (
    "Na základě následujícího obsahu vytvoř strukturovaný vzdělávací kurz.\n\n"
    "INSTRUKCE - STRUKTURA KURZU:\n"
    "1. Rozděl obsah do logických modulů\n\n"
    "INSTRUKCE - STRUKTURA MODULU:\n"
    "Pro každý modul:\n"
    "- title: Výstižný název modulu (1-200 znaků)\n"
    "- learn_blocks: Přesně JEDEN učební blok (seznam s jedním prvkem), který má:\n"
    "  * content: Kompletní text veškeré látky modulu k naučení "
    "(detailní vysvětlení tématu v markdown formátu)\n"
    "- practice_questions: Seznam otázek (2 uzavřené + 1 otevřená)\n\n"
    "INSTRUKCE - STRUKTURA OTÁZEK:\n"
    "Pro každou otázku specifikuj:\n"
    '- question_type: "closed" pro uzavřené nebo "open" pro otevřené\n'
    "- question: Text otázky\n\n"
    'Pro UZAVŘENÉ otázky (question_type="closed"):\n'
    "- correct_answer: text správné odpovědi "
    "(musí přesně odpovídat textu jedné z closed_options). A nesmí být prázdné.\n"
    "- closed_options: Seznam 3 možností, kde každá má:\n"
    "  * text: Text odpovědi\n\n"
    'Pro OTEVŘENÉ otázky (question_type="open"):\n'
    "- example_answer: Příklad správné odpovědi. NESMÍ být prázdné.\n"
    "- open_keywords: Seznam klíčových slov/bodů, které by měla odpověď obsahovat:\n"
    "  * keyword: Klíčové slovo nebo bod\n\n"
    "Všechny otázky musí ověřovat pochopení látky z learn_blocks.\n"
    "Všechno bude bez formátování, pouze čistý text. žádný markdown, žádné odrážky, "
    "pouze strohý text.\n"
    "Vytvoř kurz v českém jazyce."
)


def plan_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření modulů kurzu."""
    print("Generání modulů kurzu...")

    course_input: CourseInput | None = state.get("course_input")
    summarize_content: str = state.get("summarize_content", "")
    db = state["db"]

    if course_input is None:
        raise ValueError("course_input is not available in state")

    cfg = get_llm_config(
        db,
        "course_planner",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    model = create_chat_llm(cfg.model)
    llm_structured = model.with_structured_output(CourseGenerated)

    modules_count = course_input.modules_count_ai_generated
    title = course_input.title
    description = course_input.description or ""

    prompt = f"""{cfg.prompt}

NÁZEV KURZU: {title}
POPIS KURZU: {description}
POČET MODULŮ: {modules_count}

OBSAH K ZPRACOVÁNÍ:
{summarize_content}"""

    output: CourseGenerated = llm_structured.invoke(prompt)

    state["course"] = output

    print(f"   -> Vytvořen kurz: {output.title}")
    print(f"   -> Počet modulů: {len(output.modules)}")

    return state
