from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.assessment_evaluator.state import EvaluationState

DEFAULT_MODEL = "gpt-5.2"

DEFAULT_PROMPT = (
    "Jsi přísný, ale spravedlivý lektor. Vyhodnoť odpověď studenta na kontrolní otázku.\n\n"
    "K dispozici máš:\n"
    "1. Výukový text (zdroj správných informací)\n"
    "2. Kontrolní otázku\n"
    "3. Odpověď studenta\n\n"
    "Pravidla hodnocení:\n"
    "- Hodnoť VÝHRADNĚ na základě poskytnutého výukového textu\n"
    "- Ověřuj věcnou správnost, ne stylistiku\n"
    "- Částečně správná odpověď získá částečné body\n"
    "- Zcela špatná nebo prázdná odpověď = 0 bodů\n"
    "- Za úspěšné splnění považuj skóre odpovídající minimálnímu požadavku modulu\n\n"
    "Pravidla pro zpětnou vazbu:\n"
    "- NIKDY neprozrazuj správnou odpověď ani její části\n"
    "- Pouze naznač, ve které oblasti má student mezery "
    "(např. \u201eChybí vám pochopení vztahu mezi X a Y\u201c)\\n"
    "- Při neúspěchu motivuj studenta k dalšímu studiu, ale NEŘÍKEJ mu, co měl napsat\n"
    "- Cílem je, aby se student vrátil k výukovému materiálu a odpověď našel sám\n\n"
    "Odpověz PŘESNĚ v tomto formátu (3 řádky, nic jiného):\n"
    "SCORE: <číslo 0-100>\n"
    "PASSED: <true nebo false>\n"
    "FEEDBACK: <zpětná vazba v 1-3 větách, v češtině, BEZ správné odpovědi>"
)

DEFAULT_PASSING_SCORE = 75


def evaluate_answer(state: EvaluationState) -> dict:
    """Vyhodnotí odpověď studenta pomocí LLM."""
    print("Vyhodnocuji odpověď studenta...")

    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    question: str = state["generated_question"]
    user_response: str = state["user_response"]
    db = state["db"]

    cfg = get_llm_config(
        db,
        "assessment_evaluator",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0.3)

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(
            content=(
                f"VÝUKOVÝ TEXT:\n{learn_content}\n\n"
                f"KONTROLNÍ OTÁZKA:\n{question}\n\n"
                f"ODPOVĚĎ STUDENTA:\n{user_response}"
            )
        ),
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()

    # Parsování strukturované odpovědi
    score, _, feedback = _parse_evaluation(raw)

    # Bezpečnostní pojistka — score rozhoduje
    passing_score = state.get("passing_score", DEFAULT_PASSING_SCORE)
    is_passed = score >= passing_score

    print(
        f"Hodnocení: score={score}, passed={is_passed} (passing_score={passing_score})"
    )

    return {
        "ai_score": score,
        "is_passed": is_passed,
        "ai_feedback": feedback,
    }


def _parse_evaluation(raw: str) -> tuple[int, bool, str]:
    """Parsuje odpověď LLM ve formátu SCORE/PASSED/FEEDBACK."""
    score = 0
    is_passed = False
    feedback = raw  # fallback — celá odpověď jako feedback

    for line in raw.splitlines():
        line = line.strip()
        if line.upper().startswith("SCORE:"):
            try:
                score = int(line.split(":", 1)[1].strip())
                score = max(0, min(100, score))
            except ValueError:
                pass
        elif line.upper().startswith("PASSED:"):
            val = line.split(":", 1)[1].strip().lower()
            is_passed = val == "true"
        elif line.upper().startswith("FEEDBACK:"):
            feedback = line.split(":", 1)[1].strip()

    return score, is_passed, feedback
