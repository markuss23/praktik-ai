from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.assessment_generator.state import AssessmentState


def generate_question(state: AssessmentState) -> dict:
    """Vygeneruje assessment otázku pomocí LLM na základě learn_content."""
    print("Generuji assessment otázku...")

    # Pokud předchozí uzel nastavil chybu, přeskočíme
    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    db = state["db"]

    cfg = get_llm_config(db, "assessment_generator")
    llm = create_chat_llm(cfg.model, temperature=0.7)

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(
            content=f"Výukový text:\n{learn_content}\n\nVrať pouze text otázky, nic jiného."
        ),
    ]

    response = llm.invoke(messages)
    generated_question = response.text.strip()

    print(f"Otázka vygenerována: {generated_question[:80]}...")

    return {"generated_question": generated_question}
