from sqlalchemy.orm import Session

from api.src.assessments.open_question_ai.agents.generator.service import (
    OpenQuestionAIGenerator,
)
from api.src.assessments.open_question_ai.schemas import (
    OpenQuestionAIState,
    OpenQuestionAIView,
)


async def initial_state(db: Session, user, course_assessment, cfg):
    service = OpenQuestionAIGenerator(db, course_assessment.module_id, user)

    question = await service.generate()

    print("Generated question:", question.question)

    return OpenQuestionAIState(
        question=question.question,
    )


def view(cfg, state):
    print("view")

    print("state:", state)

    return OpenQuestionAIView(
        question=state.question,
        attempts_used=state.attempts_used,
    )


def evaluate_answer(cfg, state, answer):
    print("evaluate_answer")
    print("state:", state)
