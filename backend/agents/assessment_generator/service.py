from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.assessment_generator.graph import create_graph


@dataclass
class AssessmentResult:
    session_id: int
    generated_question: str


class AssessmentService:
    """Service pro generování assessment otázky pomocí LangGraph."""

    def __init__(self, db: Session, module_id: int, user_id: int):
        self.db = db
        self.module_id = module_id
        self.user_id = user_id

    async def generate(self) -> AssessmentResult:
        """Sestaví a spustí graf, vrátí session_id a generated_question."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "module_id": self.module_id,
                "user_id": self.user_id,
                "db": self.db,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return AssessmentResult(
            session_id=result["session_id"],
            generated_question=result["generated_question"],
        )
