from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from agents.assessment_evaluator.state import EvaluationState

SYSTEM_PROMPT = """Jsi přísný, ale spravedlivý lektor. Vyhodnoť odpověď studenta na kontrolní otázku.

K dispozici máš:
1. Výukový text (zdroj správných informací)
2. Kontrolní otázku
3. Odpověď studenta

Pravidla hodnocení:
- Hodnoť VÝHRADNĚ na základě poskytnutého výukového textu
- Ověřuj věcnou správnost, ne stylistiku
- Částečně správná odpověď získá částečné body
- Zcela špatná nebo prázdná odpověď = 0 bodů
- Za úspěšné splnění považuj skóre 60 a více

Pravidla pro zpětnou vazbu:
- NIKDY neprozrazuj správnou odpověď ani její části
- Pouze naznač, ve které oblasti má student mezery (např. „Chybí vám pochopení vztahu mezi X a Y")
- Při neúspěchu motivuj studenta k dalšímu studiu, ale NEŘÍKEJ mu, co měl napsat
- Cílem je, aby se student vrátil k výukovému materiálu a odpověď našel sám

Odpověz PŘESNĚ v tomto formátu (3 řádky, nic jiného):
SCORE: <číslo 0-100>
PASSED: <true nebo false>
FEEDBACK: <zpětná vazba v 1-3 větách, v češtině, BEZ správné odpovědi>"""

PASSING_SCORE = 60


def evaluate_answer(state: EvaluationState) -> dict:
    """Vyhodnotí odpověď studenta pomocí LLM."""
    print("Vyhodnocuji odpověď studenta...")

    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    question: str = state["generated_question"]
    user_response: str = state["user_response"]

    llm = ChatOpenAI(model="gpt-5.2", temperature=0.3)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=(
            f"VÝUKOVÝ TEXT:\n{learn_content}\n\n"
            f"KONTROLNÍ OTÁZKA:\n{question}\n\n"
            f"ODPOVĚĎ STUDENTA:\n{user_response}"
        )),
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()

    # Parsování strukturované odpovědi
    score, is_passed, feedback = _parse_evaluation(raw)

    print(f"Hodnocení: score={score}, passed={is_passed}")

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

    # Bezpečnostní pojistka — score rozhoduje
    is_passed = score >= PASSING_SCORE

    return score, is_passed, feedback
