from dataclasses import dataclass

from sqlalchemy.orm import Session

from api.src.assessments.open_question_ai.agents.generator.graph import create_graph


@dataclass
class GeneratedQuestion:
    question: str


class OpenQuestionAIGenerator:
    """Service pro generování personalizované procvičovací otázky pomocí LangGraph."""

    def __init__(self, db: Session, module_id: int, user_id: int):
        self.db = db
        self.module_id = module_id
        self.user_id = user_id

    async def generate(self) -> GeneratedQuestion:
        app = create_graph()

        result = await app.ainvoke(
            {
                "db": self.db,
                "module_id": self.module_id,
                "user_id": self.user_id,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return GeneratedQuestion(
            question=result.get("question"),
        )
