from langchain_openai import ChatOpenAI

from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput
from api.src.courses.schemas import Course


def plan_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření modulů kurzu."""
    print("Generání modulů kurzu...")

    course_input: CourseInput | None = state.get("course_input")
    summarize_content: str = state.get("summarize_content", "")

    if course_input is None:
        raise ValueError("course_input is not available in state")

    model = ChatOpenAI(model="gpt-5-mini")
    llm_structured = model.with_structured_output(Course)

    modules_count = course_input.modules_count
    title = course_input.title
    description = course_input.description or ""

    prompt = f"""Na základě následujícího obsahu vytvoř strukturovaný vzdělávací kurz.

NÁZEV KURZU: {title}
POPIS KURZU: {description}

OBSAH K ZPRACOVÁNÍ:
{summarize_content}

INSTRUKCE - STRUKTURA KURZU:
1. Použij název kurzu: "{title}"
2. Pokud je popis, použij: "{description}"
3. Rozděl obsah do přesně {modules_count} logických modulů

INSTRUKCE - STRUKTURA MODULU:
Pro každý modul ({modules_count}):
- title: Výstižný název modulu (1-200 znaků)
- position: Pořadí modulu (1, 2, 3, atd.)
- learn_blocks: Seznam učebních bloků, kde každý blok má:
  * position: Pořadí bloku (začíná od 1)
  * content: Kompletní text látky k naučení (detailní vysvětlení tématu v markdown formátu)
- practice_questions: Seznam cvičení (pro zpětnou kompatibilitu s generátorem), kde každé cvičení obsahuje:
  * position: Pořadí cvičení (začíná od 1)
  * questions: Seznam otázek (2 uzavřené + 1 otevřená) - tyto otázky budou uloženy přímo do modulu

INSTRUKCE - STRUKTURA OTÁZEK:
Pro každou otázku specifikuj:
- position: Pořadí otázky (1, 2, 3)
- question_type: "closed" pro uzavřené nebo "open" pro otevřené
- question: Text otázky

Pro UZAVŘENÉ otázky (question_type="closed"):
- correct_answer: Správná odpověď (A, B nebo C)
- closed_options: Seznam 3 možností, kde každá má:
  * position: 1, 2, 3 (pro A, B, C)
  * text: Text odpovědi

Pro OTEVŘENÉ otázky (question_type="open"):
- example_answer: Příklad správné odpovědi
- open_keywords: Seznam klíčových slov/bodů, které by měla odpověď obsahovat:
  * keyword: Klíčové slovo nebo bod

Všechny otázky musí ověřovat pochopení látky z learn_blocks.
Všechno bude bez formátování, pouze čistý text. žádný markdown, žádné odrážky, pouze strohý text.
Vytvoř kurz v českém jazyce."""

    output: Course = llm_structured.invoke(prompt)

    state["course"] = output

    print(f"   -> Vytvořen kurz: {output.title}")
    print(f"   -> Počet modulů: {len(output.modules)}")

    return state