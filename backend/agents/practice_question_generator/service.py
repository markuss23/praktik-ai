from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.practice_question_generator.graph import create_graph
from api.enums import QuestionType


@dataclass
class GeneratedQuestion:
    user_question_id: int
    generated_question: str
    options: list[dict] | None


class PracticeQuestionGenerator:
    """Service pro generování personalizované procvičovací otázky pomocí LangGraph."""

    def __init__(self, db: Session, module_id: int, user_id: int, question_type: QuestionType):
        self.db = db
        self.module_id = module_id
        self.user_id = user_id
        self.question_type = question_type

    async def generate(self) -> GeneratedQuestion:
        app = create_graph()

        result = await app.ainvoke(
            {
                "db": self.db,
                "module_id": self.module_id,
                "user_id": self.user_id,
                "question_type": self.question_type,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return GeneratedQuestion(
            user_question_id=result["user_question_id"],
            generated_question=result["generated_question"],
            options=result.get("options"),
        )
