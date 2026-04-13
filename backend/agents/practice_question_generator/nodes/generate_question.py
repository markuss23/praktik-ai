from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.practice_question_generator.state import GeneratorState
from api.enums import QuestionType

DEFAULT_MODEL = "gpt-4o"

DEFAULT_PROMPT_OPEN = (
    "Jsi tvůrce vzdělávacích otázek. Na základě poskytnutého výukového textu "
    "vytvoř jednu otevřenou procvičovací otázku v češtině.\n\n"
    "Pravidla:\n"
    "- Otázka musí vycházet výhradně z obsahu výukového textu\n"
    "- Otázka má prověřit porozumění, nikoli pouhou reprodukci\n"
    "- Odpověz POUZE samotnou otázkou, bez dalšího textu"
)

DEFAULT_PROMPT_CLOSED = (
    "Jsi tvůrce vzdělávacích otázek. Na základě poskytnutého výukového textu "
    "vytvoř jednu uzavřenou procvičovací otázku se 4 možnostmi (A–D) v češtině.\n\n"
    "Pravidla:\n"
    "- Otázka musí vycházet výhradně z obsahu výukového textu\n"
    "- Právě jedna možnost musí být správná\n"
    "- Ostatní tři možnosti musí být věrohodné, ale nesprávné\n\n"
    "Odpověz PŘESNĚ v tomto formátu (nic jiného):\n"
    "QUESTION: <otázka>\n"
    "A: <možnost>\n"
    "B: <možnost>\n"
    "C: <možnost>\n"
    "D: <možnost>\n"
    "CORRECT: <písmeno A, B, C nebo D>"
)


def generate_question(state: GeneratorState) -> dict:
    """Vygeneruje procvičovací otázku pomocí LLM."""
    print("Generuji procvičovací otázku...")

    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    question_type: QuestionType = state["question_type"]
    db = state["db"]

    is_closed = question_type == QuestionType.closed
    prompt_key = "practice_generator_closed" if is_closed else "practice_generator_open"
    default_prompt = DEFAULT_PROMPT_CLOSED if is_closed else DEFAULT_PROMPT_OPEN

    cfg = get_llm_config(
        db,
        prompt_key,
        default_model=DEFAULT_MODEL,
        default_prompt=default_prompt,
    )
    llm = create_chat_llm(cfg.model, temperature=0.7)

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(content=f"VÝUKOVÝ TEXT:\n{learn_content}"),
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()

    if is_closed:
        generated_question, options = _parse_closed(raw)
        if options is None:
            return {"error": f"LLM vrátil neočekávaný formát pro closed otázku: {raw[:200]}"}
        print(f"Closed otázka vygenerována s {len(options)} možnostmi")
        return {"generated_question": generated_question, "options": options}
    else:
        print(f"Open otázka vygenerována: {raw[:80]}...")
        return {"generated_question": raw, "options": None}


def _parse_closed(raw: str) -> tuple[str, list[dict] | None]:
    """Parsuje odpověď LLM pro closed otázku."""
    question = ""
    options_map: dict[str, str] = {}
    correct_letter = ""

    for line in raw.splitlines():
        line = line.strip()
        if line.upper().startswith("QUESTION:"):
            question = line.split(":", 1)[1].strip()
        elif line.upper().startswith("CORRECT:"):
            correct_letter = line.split(":", 1)[1].strip().upper()
        elif len(line) >= 3 and line[0].upper() in "ABCD" and line[1] == ":":
            letter = line[0].upper()
            text = line[2:].strip()
            options_map[letter] = text

    if not question or len(options_map) != 4 or correct_letter not in options_map:
        return question, None

    options = [
        {"text": text, "is_correct": letter == correct_letter}
        for letter, text in sorted(options_map.items())
    ]
    return question, options
