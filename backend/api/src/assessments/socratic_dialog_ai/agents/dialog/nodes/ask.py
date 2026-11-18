from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from api.src.assessments.socratic_dialog_ai.agents.dialog.state import DialogState
from agents.base.llm import create_chat_llm, get_llm_config


PROMPT_KEY = "socratic_dialog_ai"
PROMPT = (Path(__file__).parent.parent / "prompt.md").read_text(encoding="utf-8")

# Úroveň odpovědi -> násobek max_step. AI vybírá úroveň, číslo počítá kód
# (volné číslo by AI táhla ke středu škály).
LEVEL_FACTOR = {0: -1, 1: 0, 2: 0.5, 3: 1}


def ask(state: DialogState):
    if state.get("error"):
        return {}

    cfg = get_llm_config(state["db"], PROMPT_KEY)
    llm = create_chat_llm(cfg.model, agent=cfg.key, temperature=None)

    if state["must_end"]:
        ending = "Toto byla poslední odpověď studenta — napiš KONEC."
    elif state["can_end"]:
        ending = "Rozhovor smíš ukončit (KONEC), pokud je téma promyšlené."
    else:
        ending = "Rozhovor ještě NESMÍŠ ukončit — polož další otázku."

    # Kontext jako první zpráva studenta, pak historie: AI otázka / odpověď studenta...
    messages = [
        SystemMessage(content=PROMPT + state.get("ai_style", "")),
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
    level, question = _parse(response.text)
    return {
        "delta": int(LEVEL_FACTOR[level] * state["max_step"]),
        "question": question,
    }


def _parse(raw: str) -> tuple[int, str | None]:
    """'ÚROVEŇ: <0-3>' + 'OTÁZKA: ...' (může být víceřádková) nebo 'KONEC'.
    Nečitelná úroveň -> 1 (delta 0); chybí OTÁZKA i KONEC -> celý text je otázka."""
    level, question, ended = 1, [], False
    for line in raw.strip().splitlines():
        upper = line.strip().upper()
        if upper.startswith("ÚROVEŇ:"):
            value = line.split(":", 1)[1].strip()
            if value in ("0", "1", "2", "3"):
                level = int(value)
        elif upper.startswith("OTÁZKA:"):
            question = [line.split(":", 1)[1].strip()]
        elif upper == "KONEC":
            ended = True
        elif question:
            question.append(line.strip())
    if question:
        return level, " ".join(q for q in question if q)
    if ended:
        return level, None
    return level, raw.strip()


if __name__ == "__main__":
    assert _parse("ÚROVEŇ: 3\nOTÁZKA: Proč\nzrovna to?") == (3, "Proč zrovna to?")
    assert _parse("ÚROVEŇ: 0\nKONEC") == (0, None)
    assert _parse("ÚROVEŇ: 7\nOTÁZKA: A?") == (1, "A?")
    assert _parse("Jen otázka?") == (1, "Jen otázka?")
    assert [int(LEVEL_FACTOR[x] * 50) for x in range(4)] == [-50, 0, 25, 50]
    print("ok")
