from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.assessment_generator.state import AssessmentState

DEFAULT_MODEL = "gpt-5.2"

DEFAULT_PROMPT = (
    "Jsi odborný lektor. Na základě níže uvedeného výukového textu "
    "vytvoř jednu otevřenou kontrolní otázku.\n\n"
    "Pravidla:\n"
    "- Otázka musí být zodpověditelná výhradně z poskytnutého textu\n"
    "- Ověřuj porozumění, ne memorování\n"
    "- Otázka musí být v češtině\n"
    "- Otázka musí být konkrétní a jednoznačná\n"
    "- Délka otázky: 1-2 věty"
)


def generate_question(state: AssessmentState) -> dict:
    """Vygeneruje assessment otázku pomocí LLM na základě learn_content."""
    print("Generuji assessment otázku...")

    # Pokud předchozí uzel nastavil chybu, přeskočíme
    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    db = state["db"]

    cfg = get_llm_config(
        db,
        "assessment_generator",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0.7)

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(
            content=f"Výukový text:\n{learn_content}\n\nVrať pouze text otázky, nic jiného."
        ),
    ]

    response = llm.invoke(messages)
    generated_question = response.content.strip()

    print(f"Otázka vygenerována: {generated_question[:80]}...")

    return {"generated_question": generated_question}
