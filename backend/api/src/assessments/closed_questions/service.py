"""Průběh testu s uzavřenými otázkami.

Stav běhu v `session.result`:
    current        index aktuální otázky
    attempts_used  pokusy spotřebované na aktuální otázku
    correct_count  počet zvládnutých otázek
"""

from api.src.assessments.closed_questions.settings import ClosedQuestionsSettings
from api.src.assessments.schemas import AnswerOutcome


def initial_result(cfg: ClosedQuestionsSettings) -> dict:
    return {"current": 0}


def view(cfg: ClosedQuestionsSettings, result: dict) -> dict:
    """Co student právě vidí — aktuální otázka bez správné odpovědi."""
    question = cfg.questions[result["current"]]
    return {"question": question.question, "options": question.options}


def evaluate_answer(
    cfg: ClosedQuestionsSettings, result: dict, answer: str
) -> AnswerOutcome:
    question = cfg.questions[result["current"]]
    is_correct = answer.strip() == question.options[question.correct_index]
    attempts_used = result.get("attempts_used", 0) + 1

    # Špatně a ještě zbývají pokusy — stejná otázka znovu
    if not is_correct and attempts_used < cfg.max_attempts:
        return AnswerOutcome(
            result={**result, "attempts_used": attempts_used},
            is_correct=False,
            finished=False,
        )

    current = result["current"] + 1
    correct_count = result.get("correct_count", 0) + int(is_correct)
    new_result = {
        **result,
        "current": current,
        "attempts_used": 0,
        "correct_count": correct_count,
    }
    if current < len(cfg.questions):
        return AnswerOutcome(result=new_result, is_correct=is_correct, finished=False)

    score_ratio = correct_count / len(cfg.questions)
    return AnswerOutcome(
        result=new_result,
        is_correct=is_correct,
        finished=True,
        score=round(score_ratio * 100, 1),
        is_passed=score_ratio >= cfg.pass_threshold,
    )
