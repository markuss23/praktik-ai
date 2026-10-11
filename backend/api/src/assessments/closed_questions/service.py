"""Průběh testu s uzavřenými otázkami."""

from fastapi import HTTPException

from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionsState,
    ClosedQuestionsSettings,
    ClosedQuestionsView,
)
from api.src.assessments.outcome import AnswerOutcome


def initial_state(cfg: ClosedQuestionsSettings) -> ClosedQuestionsState:
    if not cfg.questions:
        raise HTTPException(status_code=422, detail="Test zatím nemá žádné otázky.")
    return ClosedQuestionsState()


def view(
    cfg: ClosedQuestionsSettings, state: ClosedQuestionsState
) -> ClosedQuestionsView:
    question = cfg.questions[state.current]
    return ClosedQuestionsView(question=question.question, options=question.options)


def evaluate_answer(
    cfg: ClosedQuestionsSettings, state: ClosedQuestionsState, answer: str
) -> AnswerOutcome:
    question = cfg.questions[state.current]
    is_correct = answer.strip() == question.options[question.correct_index]
    attempts_used = state.attempts_used + 1

    # Špatně a ještě zbývají pokusy — stejná otázka znovu
    if not is_correct and attempts_used < cfg.max_attempts:
        return AnswerOutcome(
            state=state.model_copy(update={"attempts_used": attempts_used}),
            is_correct=False,
            finished=False,
        )

    new_state = ClosedQuestionsState(
        current=state.current + 1,
        attempts_used=0,
        correct_count=state.correct_count + int(is_correct),
    )
    if new_state.current < len(cfg.questions):
        return AnswerOutcome(state=new_state, is_correct=is_correct, finished=False)

    score_ratio = new_state.correct_count / len(cfg.questions)
    return AnswerOutcome(
        state=new_state,
        is_correct=is_correct,
        finished=True,
        score=round(score_ratio * 100, 1),
        is_passed=score_ratio >= cfg.pass_threshold,
    )
