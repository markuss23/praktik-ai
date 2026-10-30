from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from api.src.assessments.socratic_dialog_ai.agents.dialog.state import DialogState
from agents.base.llm import create_chat_llm, get_llm_config


PROMPT_KEY = "socratic_dialog_ai"
PROMPT = (Path(__file__).parent.parent / "prompt.md").read_text(encoding="utf-8")


def ask(state: DialogState):
    if state.get("error"):
        return {}

    cfg = get_llm_config(state["db"], PROMPT_KEY)
    llm = create_chat_llm(cfg.model, temperature=None)

    if state["must_end"]:
        ending = "Toto byla poslední odpověď studenta — napiš KONEC."
    elif state["can_end"]:
        ending = "Rozhovor smíš ukončit (KONEC), pokud je téma promyšlené."
    else:
        ending = "Rozhovor ještě NESMÍŠ ukončit — polož další otázku."

    # Kontext jako první zpráva studenta, pak historie: AI otázka / odpověď studenta...
    messages = [
        SystemMessage(content=PROMPT.replace("{max_step}", str(state["max_step"]))),
        HumanMessage(
            content=(
                f"TÉMA: {state['topic']}\n\nVÝUKOVÝ TEXT:\n{state['learn_content']}"
            )
        ),
    ]
    for turn in state["turns"]:
        cls = AIMessage if turn["role"] == "assistant" else HumanMessage
        messages.append(cls(content=turn["content"]))
    messages[-1] = HumanMessage(content=f"{messages[-1].content}\n\n[{ending}]")

    response = llm.invoke(messages)
    delta, question = _parse(response.text)
    return {"delta": delta, "question": question}


def _parse(raw: str) -> tuple[int, str | None]:
    """'DELTA: <int>' + 'OTÁZKA: ...' (může být víceřádková) nebo 'KONEC'.
    Nečitelná delta -> 0; chybí OTÁZKA i KONEC -> celý text je otázka."""
    delta, question, ended = 0, [], False
    for line in raw.strip().splitlines():
        upper = line.strip().upper()
        if upper.startswith("DELTA:"):
            try:
                delta = int(line.split(":", 1)[1].strip().lstrip("+"))
            except ValueError:
                pass
        elif upper.startswith("OTÁZKA:"):
            question = [line.split(":", 1)[1].strip()]
        elif upper == "KONEC":
            ended = True
        elif question:
            question.append(line.strip())
    if question:
        return delta, " ".join(q for q in question if q)
    if ended:
        return delta, None
    return delta, raw.strip()


if __name__ == "__main__":
    assert _parse("DELTA: +20\nOTÁZKA: Proč\nzrovna to?") == (20, "Proč zrovna to?")
    assert _parse("DELTA: -35\nKONEC") == (-35, None)
    assert _parse("DELTA: hodně\nOTÁZKA: A?") == (0, "A?")
    assert _parse("Jen otázka?") == (0, "Jen otázka?")
    print("ok")
