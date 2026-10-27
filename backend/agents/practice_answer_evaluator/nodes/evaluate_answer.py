from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.practice_answer_evaluator.state import EvaluatorState


def evaluate_answer(state: EvaluatorState) -> dict:
    """Vyhodnotí otevřenou odpověď studenta pomocí LLM."""
    print("Vyhodnocuji otevřenou procvičovací odpověď...")

    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    question: str = state["generated_question"]
    user_input: str = state["user_input"]
    db = state["db"]

    cfg = get_llm_config(db, "practice_answer_evaluator")
    llm = create_chat_llm(cfg.model, temperature=0.3)

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(
            content=(
                f"VÝUKOVÝ TEXT:\n{learn_content}\n\n"
                f"PROCVIČOVACÍ OTÁZKA:\n{question}\n\n"
                f"ODPOVĚĎ STUDENTA:\n{user_input}"
            )
        ),
    ]

    response = llm.invoke(messages)
    raw = response.text.strip()

    is_correct, ai_response = _parse_evaluation(raw)
    print(f"Vyhodnocení: correct={is_correct}")

    return {"is_correct": is_correct, "ai_response": ai_response}


def _parse_evaluation(raw: str) -> tuple[bool, str]:
    """Parsuje odpověď LLM ve formátu CORRECT/FEEDBACK."""
    is_correct = False
    feedback = raw  # fallback

    for line in raw.splitlines():
        line = line.strip()
        if line.upper().startswith("CORRECT:"):
            val = line.split(":", 1)[1].strip().lower()
            is_correct = val == "true"
        elif line.upper().startswith("FEEDBACK:"):
            feedback = line.split(":", 1)[1].strip()

    return is_correct, feedback
