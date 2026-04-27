from langchain_core.messages.ai import AIMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput
from api.src.agents.progress import set_progress

DEFAULT_MODEL = "gpt-5.2"

DEFAULT_PROMPT = (
    "Analyzuj následující obsah a vytvoř strukturovaný souhrn "
    "optimalizovaný pro vytvoření vzdělávacího kurzu.\n\n"
    "INSTRUKCE:\n"
    "1. Identifikuj hlavní tematické celky, které lze rozdělit do samostatných modulů. "
    "Pokud obsah pokrývá méně témat, rozděl dostupný obsah na logické části bez vymýšlení nového obsahu.\n"
    "2. Pro každý tematický celek extrahuj:\n"
    "- Klíčové koncepty a pojmy k naučení\n"
    "- Praktické příklady a ukázky\n"
    "- Fakta vhodná pro testové otázky (ABC)\n\n"
    "3. Výstup strukturuj takto:\n\n"
    "TÉMA 1: [název tématu]\n"
    "- Klíčové koncepty: [seznam pojmů a definic]\n"
    "- Látka k naučení: [detailní vysvětlení]\n"
    "- Testovatelná fakta: [konkrétní informace pro otázky]\n\n"
    "TÉMA 2: [název tématu]\n"
    "...\n\n"
    "4. Zachovej odbornou terminologii a přesné definice\n"
    "5. Maximální délka: 4000 znaků\n"
    "6. Piš v češtině, bez markdown formátování"
)


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

    cfg = get_llm_config(
        db,
        "course_summarizer",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    model = create_chat_llm(cfg.model)

    modules_count = course_input.modules_count_ai_generated

    prompt: str = f"""{cfg.prompt}

                KURZ: {course_input.title}
                POPIS: {course_input.description}
                POČET MODULŮ: {modules_count}

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
