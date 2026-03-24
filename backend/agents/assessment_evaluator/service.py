from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.assessment_evaluator.graph import create_graph


@dataclass
class EvaluationResult:
    attempt_id: int
    ai_score: int
    is_passed: bool
    ai_feedback: str


class EvaluationService:
    """Service pro vyhodnocení assessment odpovědi pomocí LangGraph."""

    def __init__(self, db: Session, session_id: int, user_id: int, user_response: str):
        self.db = db
        self.session_id = session_id
        self.user_id = user_id
        self.user_response = user_response

    async def evaluate(self) -> EvaluationResult:
        """Sestaví a spustí graf, vrátí výsledek hodnocení."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "session_id": self.session_id,
                "user_id": self.user_id,
                "user_response": self.user_response,
                "db": self.db,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return EvaluationResult(
            attempt_id=result["attempt_id"],
            ai_score=result["ai_score"],
            is_passed=result["is_passed"],
            ai_feedback=result["ai_feedback"],
        )
