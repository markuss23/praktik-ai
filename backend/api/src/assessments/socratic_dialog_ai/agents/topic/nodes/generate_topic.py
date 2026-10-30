from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage

from api.src.assessments.socratic_dialog_ai.agents.topic.state import TopicState
from agents.base.llm import create_chat_llm, get_llm_config


PROMPT_KEY = "socratic_dialog_ai_topic"
PROMPT = (Path(__file__).parent.parent / "prompt.md").read_text(encoding="utf-8")


def generate_topic(state: TopicState):
    if state.get("error"):
        return {}

    cfg = get_llm_config(state["db"], PROMPT_KEY)
    llm = create_chat_llm(cfg.model, temperature=None)

    messages = [
        SystemMessage(content=PROMPT),
        HumanMessage(content=f"VÝUKOVÝ TEXT:\n{state['learn_content']}"),
    ]

    response = llm.invoke(messages)
    topic, question = _parse(response.text)
    if not topic or not question:
        return {"error": f"AI nevrátila téma a otázku: {response.text[:200]}"}
    return {"topic": topic, "question": question}


def _parse(raw: str) -> tuple[str, str]:
    """Vytáhne z odpovědi řádky 'TÉMA: ...' a 'OTÁZKA: ...' (otázka může být víceřádková)."""
    topic, question = "", []
    for line in raw.strip().splitlines():
        upper = line.upper()
        if upper.startswith("TÉMA:"):
            topic = line.split(":", 1)[1].strip()
        elif upper.startswith("OTÁZKA:"):
            question = [line.split(":", 1)[1].strip()]
        elif question:
            question.append(line.strip())
    return topic, " ".join(q for q in question if q)


if __name__ == "__main__":
    assert _parse("TÉMA: Fotosyntéza\nOTÁZKA: Proč rostlina\npotřebuje světlo?") == (
        "Fotosyntéza",
        "Proč rostlina potřebuje světlo?",
    )
    assert _parse("téma: A\notázka: B") == ("A", "B")
    assert _parse("jen text") == ("", "")
    print("ok")
