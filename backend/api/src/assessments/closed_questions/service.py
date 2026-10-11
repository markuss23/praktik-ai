"""Průběh testu s uzavřenými otázkami."""

from fastapi import HTTPException

from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionsResult,
    ClosedQuestionsSettings,
    ClosedQuestionsView,
)
from api.src.assessments.outcome import AnswerOutcome


def initial_result(cfg: ClosedQuestionsSettings) -> ClosedQuestionsResult:
    if not cfg.questions:
        raise HTTPException(status_code=422, detail="Test zatím nemá žádné otázky.")
    return ClosedQuestionsResult()


def view(
    cfg: ClosedQuestionsSettings, result: ClosedQuestionsResult
) -> ClosedQuestionsView:
    question = cfg.questions[result.current]
    return ClosedQuestionsView(question=question.question, options=question.options)


def evaluate_answer(
    cfg: ClosedQuestionsSettings, result: ClosedQuestionsResult, answer: str
) -> AnswerOutcome:
    question = cfg.questions[result.current]
    is_correct = answer.strip() == question.options[question.correct_index]
    attempts_used = result.attempts_used + 1

    # Špatně a ještě zbývají pokusy — stejná otázka znovu
    if not is_correct and attempts_used < cfg.max_attempts:
        return AnswerOutcome(
            result=result.model_copy(update={"attempts_used": attempts_used}),
            is_correct=False,
            finished=False,
        )

    new_result = ClosedQuestionsResult(
        current=result.current + 1,
        attempts_used=0,
        correct_count=result.correct_count + int(is_correct),
    )
    if new_result.current < len(cfg.questions):
        return AnswerOutcome(result=new_result, is_correct=is_correct, finished=False)

    score_ratio = new_result.correct_count / len(cfg.questions)
    return AnswerOutcome(
        result=new_result,
        is_correct=is_correct,
        finished=True,
        score=round(score_ratio * 100, 1),
        is_passed=score_ratio >= cfg.pass_threshold,
    )
