from sqlalchemy.orm import Session

from api.src.assessments.open_question_ai.agents.generator.service import (
    OpenQuestionAIGenerator,
)


async def initial_state(db: Session, user, course_assessment, cfg):
    service = OpenQuestionAIGenerator(db, course_assessment.module_id, user)

    print(await service.generate())


def view():
    print("view")


def evaluate_answer():
    pass
