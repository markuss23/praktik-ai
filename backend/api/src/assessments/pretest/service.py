"""Průběh pretestu — 2 uzavřené + 1 otevřená otázka z course_assessment.settings.

Pretest je pevně daný: pravidla jsou konstanty tady, lektor upravuje jen
texty otázek (PUT /assessments/{id}/pretest). Uzavřené otázky se vyhodnocují
bez LLM (odpověď = index možnosti), otevřená přes open_question_evaluator s vlastním promptem
(evaluator_prompt.md; vzorová odpověď + klíčové body).
"""

from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from agents.open_question_evaluator import evaluate_open_question
from api.src.assessments.outcome import AnswerOutcome
from api.src.assessments.pretest.schemas import (
    CLOSED_COUNT,
    PretestSettings,
    PretestState,
    PretestView,
)

MAX_ATTEMPTS = 3
PASS_THRESHOLD = 1.0  # 3 ze 3
QUESTION_COUNT = CLOSED_COUNT + 1
# Mírnější než sdílený open_question_evaluator — pretest je jen concept check
EVALUATOR_PROMPT = (Path(__file__).parent / "evaluator_prompt.md").read_text(
    encoding="utf-8"
)


async def initial_state(
    db: Session, user, course_assessment, cfg: PretestSettings
) -> PretestState:
    # Otázky zvaliduje už parse_settings (pevná struktura 2 + 1)
    return PretestState()


def view(cfg: PretestSettings, state: PretestState) -> PretestView:
    if state.current < CLOSED_COUNT:
        q = cfg.closed[state.current]
        return PretestView(question=q.question, options=q.options)
    return PretestView(question=cfg.open.question)


def TYPED_ANSWER(state: PretestState) -> bool:
    """Psaná je jen otevřená otázka — u uzavřených se kliká."""
    return state.current == CLOSED_COUNT


async def evaluate_answer(
    db: Session,
    course_assessment,
    cfg: PretestSettings,
    state: PretestState,
    answer: str,
) -> AnswerOutcome:
    feedback = None
    if state.current < CLOSED_COUNT:
        q = cfg.closed[state.current]
        # Odpověď je index možnosti (0 = první v `options` z view)
        try:
            chosen = int(answer)
        except ValueError:
            chosen = -1
        if not 0 <= chosen < len(q.options):
            # Neplatný vstup se nepočítá jako pokus
            raise HTTPException(
                status_code=422,
                detail=f"Odpověď na uzavřenou otázku je index možnosti 0–{len(q.options) - 1}.",
            )
        is_correct = chosen == q.correct_index
    else:
        result = await evaluate_open_question(
            db,
            question=cfg.open.question,
            example_answer=cfg.open.example_answer,
            keywords=cfg.open.keywords,
            user_input=answer,
            prompt=EVALUATOR_PROMPT,
        )
        is_correct, feedback = result.is_correct, result.feedback
    attempts_used = state.attempts_used + 1

    # Špatně a ještě zbývají pokusy — stejná otázka znovu
    if not is_correct and attempts_used < MAX_ATTEMPTS:
        return AnswerOutcome(
            state=state.model_copy(
                update={"attempts_used": attempts_used, "last_answer": answer}
            ),
            is_correct=False,
            finished=False,
            feedback=feedback,
        )

    new_state = PretestState(
        current=state.current + 1,
        correct_count=state.correct_count + int(is_correct),
    )
    if new_state.current < QUESTION_COUNT:
        return AnswerOutcome(
            state=new_state, is_correct=is_correct, finished=False, feedback=feedback
        )

    score_ratio = new_state.correct_count / QUESTION_COUNT
    return AnswerOutcome(
        state=new_state,
        is_correct=is_correct,
        finished=True,
        score=round(score_ratio * 100, 1),
        is_passed=score_ratio >= PASS_THRESHOLD,
        feedback=feedback,
    )
