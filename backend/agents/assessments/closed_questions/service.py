"""
Interakční formát 'Uzavřené otázky'.

Žádná třída — jen tři funkce (start, handle_turn, current_view), přesně
podle toho, co čeká REGISTRY v agents/assessments/__init__.py. Každá
funkce dostane db/session jako obyčejné argumenty a sama si z DB přečte,
co potřebuje — nic se mezi voláními nepamatuje v paměti.

Průběh: při startu se z lektorovy sady vybere (a zamíchá) zásobník otázek,
student do něj sahá po jedné tahem ``option``. Na každou otázku má
``max_attempts`` pokusů — dokud neodpoví správně nebo pokusy nevyčerpá,
zůstává na stejné otázce; teprve pak postoupí na další ze zásobníku.
Po poslední otázce se spočítá skóre (podíl otázek zodpovězených správně,
včetně pokusů) proti ``pass_threshold`` a session končí ``passed``/``failed``.

Formát nepoužívá LLM — vyhodnocení je deterministické. Správné odpovědi
žijí jen v ``settings_snapshot`` a klientovi se nikdy neposílají — ani po
vyčerpání pokusů se neprozrazují; view obsahuje pouze texty možností
v zamíchaném pořadí.
"""

import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from agents.assessments.base import TurnResult, add_turn, get_settings, update_result
from agents.assessments.closed_questions.settings import ClosedQuestionsSettings
from agents.assessments.schemas import (
    ClosedQuestionView,
    OptionTurnInput,
    ResultView,
    TurnInput,
)
from api import models
from api.enums import AssessmentSessionStatus, AssessmentTurnRole


def _cfg(session: models.AssessmentSession) -> ClosedQuestionsSettings:
    """Zkratka: zvalidované settings téhle session."""
    return get_settings(session, ClosedQuestionsSettings)


def start(db: Session, session: models.AssessmentSession) -> TurnResult:
    cfg = _cfg(session)

    # Výběr a pořadí otázek — indexy do settings_snapshot.questions.
    # Ukládá se do result, aby refresh stránky nevylosoval jinou sadu.
    question_order = list(range(len(cfg.questions)))
    random.shuffle(question_order)
    if cfg.num_questions is not None:
        question_order = question_order[: cfg.num_questions]

    # Permutace možností per otázka: option_orders[i][j] = původní index
    # možnosti zobrazené na pozici j u i-té otázky.
    option_orders: list[list[int]] = []
    for question_index in question_order:
        order = list(range(len(cfg.questions[question_index].options)))
        if cfg.shuffle_options:
            random.shuffle(order)
        option_orders.append(order)

    update_result(
        session,
        question_order=question_order,
        option_orders=option_orders,
        current=0,
        attempts_used=0,
        correct_count=0,
        last_answer_correct=None,
    )
    add_turn(
        db,
        session,
        AssessmentTurnRole.system,
        content=f"Vybráno {len(question_order)} otázek",
        payload={"question_order": question_order},
    )

    return TurnResult(
        status=AssessmentSessionStatus.in_progress,
        view=_question_view(session),
    )


def handle_turn(db: Session, session: models.AssessmentSession, turn: TurnInput) -> TurnResult:
    if not isinstance(turn, OptionTurnInput):
        raise ValueError(
            f"Formát 'Uzavřené otázky' nepodporuje tah '{turn.kind}' — "
            "očekává se tah 'option'"
        )

    cfg = _cfg(session)
    result = session.result or {}
    current: int = result["current"]
    question_order: list[int] = result["question_order"]
    option_orders: list[list[int]] = result["option_orders"]
    attempts_used: int = result.get("attempts_used", 0)

    question = cfg.questions[question_order[current]]
    option_order = option_orders[current]
    if turn.option_index >= len(option_order):
        raise ValueError(
            f"Otázka má jen {len(option_order)} možností "
            f"(posláno option_index={turn.option_index})"
        )

    # Přemapování zobrazené pozice zpět na původní index možnosti
    chosen_original_index = option_order[turn.option_index]
    is_correct = chosen_original_index == question.correct_index
    attempts_used += 1
    attempts_exhausted = not is_correct and attempts_used >= cfg.max_attempts

    add_turn(
        db,
        session,
        AssessmentTurnRole.student,
        content=question.options[chosen_original_index],
        payload={
            "question_index": question_order[current],
            "selected_option_index": chosen_original_index,
            "is_correct": is_correct,
            "attempt_number": attempts_used,
        },
    )

    if not is_correct and not attempts_exhausted:
        # Pokusy ještě zbývají — zůstáváme na stejné otázce
        update_result(session, attempts_used=attempts_used, last_answer_correct=False)
        return TurnResult(
            status=AssessmentSessionStatus.in_progress,
            view=_question_view(session),
        )

    # Správně, nebo vyčerpané pokusy — otázka je hotová, jde se dál
    correct_count = result["correct_count"] + int(is_correct)
    current += 1
    update_result(
        session,
        current=current,
        attempts_used=0,
        correct_count=correct_count,
        last_answer_correct=is_correct,
    )

    if current < len(question_order):
        return TurnResult(
            status=AssessmentSessionStatus.in_progress,
            view=_question_view(session),
        )
    return _finish(session, correct_count, len(question_order))


def current_view(session: models.AssessmentSession):
    result = session.result or {}
    current: int = result.get("current", 0)
    question_order: list[int] = result.get("question_order", [])
    # Krom session.status kontrolujeme i data napřímo — session, u které
    # se `current` už dostalo na konec zásobníku, je fakticky hotová,
    # i kdyby se stav z nějakého důvodu nestihl (nebo nemohl) překlopit
    # na passed/failed (např. přerušený request).
    if (
        session.status != AssessmentSessionStatus.in_progress
        or current >= len(question_order)
    ):
        return _result_view(session)
    return _question_view(session)


# ---------- interní pomocné funkce (jen pro tenhle formát) ----------


def _finish(session: models.AssessmentSession, correct_count: int, total: int) -> TurnResult:
    cfg = _cfg(session)
    score = round(correct_count / total * 100, 1)
    is_passed = score >= cfg.pass_threshold * 100

    session.score = score
    session.is_passed = is_passed
    session.finished_at = datetime.now(timezone.utc)

    return TurnResult(
        status=(
            AssessmentSessionStatus.passed
            if is_passed
            else AssessmentSessionStatus.failed
        ),
        view=_result_view(session, correct_count=correct_count, total=total),
    )


def _question_view(session: models.AssessmentSession) -> ClosedQuestionView:
    cfg = _cfg(session)
    result = session.result or {}
    current: int = result["current"]
    question_order: list[int] = result["question_order"]

    question = cfg.questions[question_order[current]]
    option_order = result["option_orders"][current]
    attempts_used: int = result.get("attempts_used", 0)

    return ClosedQuestionView(
        question=question.question,
        options=[question.options[i] for i in option_order],
        question_number=current + 1,
        total_questions=len(question_order),
        attempts_remaining=cfg.max_attempts - attempts_used,
        last_answer_correct=result.get("last_answer_correct"),
    )


def _result_view(
    session: models.AssessmentSession,
    correct_count: int | None = None,
    total: int | None = None,
) -> ResultView:
    result = session.result or {}
    if correct_count is None:
        correct_count = result.get("correct_count", 0)
    if total is None:
        total = len(result.get("question_order", []))

    verdict = "Úspěšně splněno" if session.is_passed else "Nesplněno"
    return ResultView(
        score=session.score,
        is_passed=session.is_passed,
        message=f"{verdict} — {correct_count} z {total} otázek správně.",
    )
