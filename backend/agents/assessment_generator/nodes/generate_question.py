from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from agents.assessment_generator.state import AssessmentState

SYSTEM_PROMPT = """Jsi odborný lektor. Na základě níže uvedeného výukového textu vytvoř jednu otevřenou kontrolní otázku.

Pravidla:
- Otázka musí být zodpověditelná výhradně z poskytnutého textu
- Ověřuj porozumění, ne memorování
- Otázka musí být v češtině
- Otázka musí být konkrétní a jednoznačná
- Délka otázky: 1-2 věty"""


def generate_question(state: AssessmentState) -> dict:
    """Vygeneruje assessment otázku pomocí LLM na základě learn_content."""
    print("Generuji assessment otázku...")

    # Pokud předchozí uzel nastavil chybu, přeskočíme
    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]

    llm = ChatOpenAI(model="gpt-5.2", temperature=0.7)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"Výukový text:\n{learn_content}\n\nVrať pouze text otázky, nic jiného."
        ),
    ]

    response = llm.invoke(messages)
    generated_question = response.content.strip()

    print(f"Otázka vygenerována: {generated_question[:80]}...")

    return {"generated_question": generated_question}
