import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import TypeAdapter, ValidationError

from api.src.assessments import closed_questions_ai as fmt
from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionItem,
    ClosedQuestionsSettings,
)
from api.src.assessments.closed_questions_ai.schemas import (
    ClosedQuestionsAISettings,
    ClosedQuestionsAIState,
)
from api.src.assessments.open_question_ai.schemas import OpenQuestionAISettings
from api.src.assessments.schemas import AssessmentSettings

QUESTIONS = [
    ClosedQuestionItem(question="1+1?", options=["1", "2"], correct_index=1),
    ClosedQuestionItem(question="2+2?", options=["4", "5"], correct_index=0),
]
CFG = ClosedQuestionsAISettings(max_attempts=2, pass_threshold=0.5)


def answer(state, text):
    return asyncio.run(fmt.evaluate_answer(None, None, CFG, state, text))


@pytest.mark.parametrize(
    "raw,expected",
    [
        ({"question_count": 3}, ClosedQuestionsAISettings),
        ({"max_attempts": 2}, OpenQuestionAISettings),
        ({"questions": []}, ClosedQuestionsSettings),
    ],
)
def test_settings_union_picks_right_format(raw, expected):
    assert type(TypeAdapter(AssessmentSettings).validate_python(raw)) is expected


def test_state_requires_questions():
    with pytest.raises(ValidationError):
        ClosedQuestionsAIState(questions=[])


def test_initial_state_stores_generated_questions():
    ca = SimpleNamespace(course_id=7, module_id=None)
    gen = "api.src.assessments.closed_questions_ai.service.ClosedQuestionsAIGenerator"
    with patch(gen) as cls:
        cls.return_value.generate = AsyncMock(return_value=QUESTIONS)
        state = asyncio.run(fmt.initial_state(None, None, ca, CFG))

    cls.assert_called_once_with(None, 7, None, CFG.question_count)
    assert state.questions == QUESTIONS
    assert state.current == 0


def test_view_hides_correct_answer():
    v = fmt.view(CFG, ClosedQuestionsAIState(questions=QUESTIONS))
    assert v.question == "1+1?"
    assert "correct_index" not in v.model_dump()


def test_wrong_answer_retries_and_keeps_questions():
    out = answer(ClosedQuestionsAIState(questions=QUESTIONS), "1")
    assert not out.is_correct and not out.finished
    assert isinstance(out.state, ClosedQuestionsAIState)
    assert out.state.questions == QUESTIONS
    assert (out.state.current, out.state.attempts_used) == (0, 1)


def test_full_run_finishes_with_score():
    state = ClosedQuestionsAIState(questions=QUESTIONS)
    out = answer(state, "2")
    assert out.is_correct and out.state.current == 1
    assert out.state.questions == QUESTIONS

    # 2× špatně na druhé otázce = vyčerpané pokusy → konec
    out = answer(out.state, "5")
    out = answer(out.state, "5")
    assert out.finished
    assert out.score == 50.0
    assert out.is_passed is True


def run(cfg, state, *answers):
    for text in answers:
        out = asyncio.run(fmt.evaluate_answer(None, None, cfg, state, text))
        state = out.state
    return out


@pytest.mark.parametrize(
    "raw",
    [
        {"question_count": 0},
        {"question_count": 21},
        {"pass_threshold": 1.5},
        {"max_attempts": 0},
        {"question_count": 3, "unknown": 1},
    ],
)
def test_ai_settings_rejects_invalid(raw):
    with pytest.raises(ValidationError):
        ClosedQuestionsAISettings(**raw)


def test_settings_union_rejects_mixed_formats():
    # question_count + questions nesedí na žádný formát
    with pytest.raises(ValidationError):
        TypeAdapter(AssessmentSettings).validate_python(
            {"question_count": 3, "questions": []}
        )


def test_initial_state_propagates_generator_error():
    ca = SimpleNamespace(course_id=7, module_id=1)
    gen = "api.src.assessments.closed_questions_ai.service.ClosedQuestionsAIGenerator"
    with patch(gen) as cls:
        cls.return_value.generate = AsyncMock(side_effect=ValueError("no content"))
        with pytest.raises(ValueError, match="no content"):
            asyncio.run(fmt.initial_state(None, None, ca, CFG))


def test_state_survives_db_roundtrip():
    # controller ukládá model_dump() do JSON a čte zpět přes State.model_validate
    out = answer(ClosedQuestionsAIState(questions=QUESTIONS), "1")
    loaded = fmt.State.model_validate(out.state.model_dump())
    assert loaded == out.state
    assert loaded.questions == QUESTIONS


def test_answer_is_stripped():
    assert answer(ClosedQuestionsAIState(questions=QUESTIONS), "  2 \n").is_correct


def test_correct_after_retry_counts_and_resets_attempts():
    out = run(CFG, ClosedQuestionsAIState(questions=QUESTIONS), "1", "2")
    assert out.is_correct
    assert (out.state.current, out.state.attempts_used, out.state.correct_count) == (
        1,
        0,
        1,
    )


def test_single_attempt_moves_on_after_wrong_answer():
    cfg = ClosedQuestionsAISettings(max_attempts=1)
    out = run(cfg, ClosedQuestionsAIState(questions=QUESTIONS), "1")
    assert not out.is_correct and out.state.current == 1


def test_view_follows_current_question():
    out = answer(ClosedQuestionsAIState(questions=QUESTIONS), "2")
    assert fmt.view(CFG, out.state).question == "2+2?"


@pytest.mark.parametrize(
    "answers,score,passed",
    [
        (["2", "4"], 100.0, True),
        (["1", "1", "5", "5"], 0.0, False),
        (["2", "5", "5"], 50.0, True),  # přesně na prahu 0.5 → passed
    ],
    ids=["all-correct", "all-wrong", "on-threshold"],
)
def test_final_score(answers, score, passed):
    out = run(CFG, ClosedQuestionsAIState(questions=QUESTIONS), *answers)
    assert out.finished
    assert out.score == score
    assert out.is_passed is passed
