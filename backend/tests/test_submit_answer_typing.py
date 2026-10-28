import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from api.enums import AssessmentSessionStatus
from api.src.assessments import controllers
from api.src.assessments.outcome import AnswerOutcome
from api.src.assessments.open_question_ai.schemas import OpenQuestionAIState

LONG = "slovo " * 100  # 600 znaků


def submit(type_code, state, answer, seconds_ago):
    session = SimpleNamespace(
        session_id=1,
        status=AssessmentSessionStatus.in_progress,
        state=state,
        updated_at=datetime.now(UTC) - timedelta(seconds=seconds_ago),
        course_assessment=SimpleNamespace(
            assessment_type_code=type_code, settings={}, course=None
        ),
    )
    db = MagicMock()
    db.scalar.return_value = session
    evaluate = AsyncMock(
        return_value=AnswerOutcome(
            state=OpenQuestionAIState(question="Q?", attempts_used=1),
            is_correct=False,
            finished=False,
        )
    )
    with (
        patch.object(controllers, "check_enrollment"),
        patch("api.src.assessments.open_question_ai.evaluate_answer", evaluate),
    ):
        try:
            asyncio.run(controllers.submit_answer(db, SimpleNamespace(user_id=1), 1, answer))
        except HTTPException as e:
            return e.status_code, evaluate.await_count
    return 200, evaluate.await_count


def test_pasted_answer_rejected_before_ai():
    assert submit("open_question_ai", {"question": "Q?"}, LONG, 1) == (400, 0)


def test_typed_answer_passes():
    assert submit("open_question_ai", {"question": "Q?"}, LONG, 120) == (200, 1)


def test_edit_of_previous_answer_passes():
    state = {"question": "Q?", "last_answer": LONG}
    assert submit("open_question_ai", state, LONG + "oprava", 2) == (200, 1)


def test_new_state_remembers_answer():
    from api.src.assessments.open_question_ai import service

    result = SimpleNamespace(score=10, ai_response="ne")
    with patch.object(service, "OpenQuestionAIEvaluator") as ev:
        ev.return_value.evaluate = AsyncMock(return_value=result)
        cfg = SimpleNamespace(pass_threshold=0.75, max_attempts=3)
        outcome = asyncio.run(
            service.evaluate_answer(
                None, SimpleNamespace(module_id=1), cfg,
                OpenQuestionAIState(question="Q?"), "moje odpověď",
            )
        )
    assert outcome.state.last_answer == "moje odpověď"


@pytest.mark.parametrize("type_code", ["closed_questions", "closed_questions_ai"])
def test_closed_formats_skip_check(type_code):
    # u uzavřených otázek se kliká, rychlost psaní nedává smysl
    # dál spadne na prázdných settings — tady jde jen o to, že kontrola neproběhla
    with patch.object(controllers, "typed_too_fast") as guard, pytest.raises(Exception) as e:
        print(e)
        submit(type_code, {}, LONG, 0)
    guard.assert_not_called()
