from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from api.src.assessments.open_question_ai.agents.evaluator.state import EvaluatorState


PROMPT_KEY = "open_question_ai_evaluator"
PROMPT = (Path(__file__).parent.parent / "prompt.md").read_text(encoding="utf-8")


def evaluate_answer(state: EvaluatorState) -> dict:
    """Vyhodnotí otevřenou odpověď studenta pomocí LLM."""
    print("Vyhodnocuji otevřenou procvičovací odpověď...")

    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    question: str = state["question"]
    answer: str = state["answer"]
    db = state["db"]

    cfg = get_llm_config(db, PROMPT_KEY)
    llm = create_chat_llm(cfg.model, temperature=None)

    messages = [
        SystemMessage(content=PROMPT),
        HumanMessage(
            content=(
                f"VÝUKOVÝ TEXT:\n{learn_content}\n\n"
                f"PROCVIČOVACÍ OTÁZKA:\n{question}\n\n"
                f"ODPOVĚĎ STUDENTA:\n{answer}"
            )
        ),
    ]

    response = llm.invoke(messages)
    raw = response.text.strip()

    score, ai_response = _parse_evaluation(raw)
    print(f"Vyhodnocení: score={score}")

    return {"score": score, "ai_response": ai_response}


def _parse_evaluation(raw: str) -> tuple[float, str]:
    """Parsuje odpověď LLM ve formátu SCORE/FEEDBACK."""
    score = 0.0
    feedback = raw  # fallback

    for line in raw.splitlines():
        line = line.strip()
        if line.upper().startswith("SCORE:"):
            try:
                score = float(line.split(":", 1)[1].strip())
            except ValueError:
                pass
        elif line.upper().startswith("FEEDBACK:"):
            feedback = line.split(":", 1)[1].strip()

    return score, feedback


if __name__ == "__main__":
    assert _parse_evaluation("SCORE: 80\nFEEDBACK: Dobře.") == (80.0, "Dobře.")
    assert _parse_evaluation("SCORE: ?") == (0.0, "SCORE: ?")
    print("ok")
