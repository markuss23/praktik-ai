from sqlalchemy.orm import Session

from api.src.assessments.closed_questions.schemas import ClosedQuestionItem
from api.src.assessments.closed_questions_ai.agents.generator.graph import create_graph


class ClosedQuestionsAIGenerator:
    """Service pro generování sady uzavřených otázek pomocí LangGraph."""

    def __init__(self, db: Session, course_id: int, module_id: int | None, count: int):
        self.db = db
        self.course_id = course_id
        self.module_id = module_id
        self.count = count

    async def generate(self) -> list[ClosedQuestionItem]:
        app = create_graph()

        result = await app.ainvoke(
            {
                "db": self.db,
                "course_id": self.course_id,
                "module_id": self.module_id,
                "count": self.count,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return result["questions"]
