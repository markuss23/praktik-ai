from sqlalchemy.orm import Session

from api.src.assessments.open_question_ai.agents.generator.service import (
    OpenQuestionAIGenerator,
)
from api.src.assessments.open_question_ai.schemas import (
    OpenQuestionAIState,
    OpenQuestionAIView,
)
from api.src.assessments.outcome import AnswerOutcome
from api.src.assessments.open_question_ai.agents.evaluator.service import (
    OpenQuestionAIEvaluator,
)


async def initial_state(
    db: Session, user, course_assessment, cfg
) -> OpenQuestionAIState:
    service = OpenQuestionAIGenerator(db, course_assessment.module_id, user)

    question = await service.generate()

    return OpenQuestionAIState(
        question=question.question,
    )


def view(cfg, state) -> OpenQuestionAIView:

    return OpenQuestionAIView(
        question=state.question,
    )


async def evaluate_answer(db, course_assessment, cfg, state, answer) -> AnswerOutcome:
    service = OpenQuestionAIEvaluator(
        db, course_assessment.module_id, answer, state.question
    )

    result = await service.evaluate()

    attempts_used = state.attempts_used + 1
    new_state = state.model_copy(update={"attempts_used": attempts_used})
    # Správnost se odvozuje ze skóre, aby se nerozcházela s is_passed
    is_correct = result.score / 100 >= cfg.pass_threshold

    # Špatně a ještě zbývají pokusy — stejná otázka znovu
    if not is_correct and attempts_used < cfg.max_attempts:
        return AnswerOutcome(
            state=new_state,
            is_correct=False,
            finished=False,
            feedback=result.ai_response,
        )

    return AnswerOutcome(
        state=new_state,
        is_correct=is_correct,
        finished=True,
        score=result.score,
        is_passed=is_correct,
        feedback=result.ai_response,
    )
