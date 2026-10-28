"""Průběh testu s uzavřenými otázkami vygenerovanými AI.

Otázky se generují jednou při startu session a ukládají do state. Vyhodnocení
už AI nepotřebuje — deleguje se na closed_questions, jen otázky bere ze state.
"""

from sqlalchemy.orm import Session

from api.src.assessments import closed_questions
from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionsSettings,
    ClosedQuestionsView,
)
from api.src.assessments.closed_questions_ai.agents.generator.service import (
    ClosedQuestionsAIGenerator,
)
from api.src.assessments.closed_questions_ai.schemas import (
    ClosedQuestionsAISettings,
    ClosedQuestionsAIState,
)
from api.src.assessments.outcome import AnswerOutcome


def _as_closed(
    cfg: ClosedQuestionsAISettings, state: ClosedQuestionsAIState
) -> ClosedQuestionsSettings:
    """Otázky ze state + pravidla z cfg = nastavení obyčejných closed_questions."""
    return ClosedQuestionsSettings(
        questions=state.questions,
        max_attempts=cfg.max_attempts,
        pass_threshold=cfg.pass_threshold,
    )


async def initial_state(
    db: Session, user, course_assessment, cfg: ClosedQuestionsAISettings
) -> ClosedQuestionsAIState:
    service = ClosedQuestionsAIGenerator(
        db,
        course_assessment.course_id,
        course_assessment.module_id,
        cfg.question_count,
    )
    return ClosedQuestionsAIState(questions=await service.generate())


def view(
    cfg: ClosedQuestionsAISettings, state: ClosedQuestionsAIState
) -> ClosedQuestionsView:
    return closed_questions.view(_as_closed(cfg, state), state)


async def evaluate_answer(
    db: Session,
    course_assessment,
    cfg: ClosedQuestionsAISettings,
    state: ClosedQuestionsAIState,
    answer: str,
) -> AnswerOutcome:
    outcome = await closed_questions.evaluate_answer(
        db, course_assessment, _as_closed(cfg, state), state, answer
    )
    # closed_questions vrací holý ClosedQuestionsState — vrátit do něj otázky
    # dict() mělce, model_dump() by z questions udělal holé dicty
    outcome.state = state.model_copy(update=dict(outcome.state))
    return outcome
