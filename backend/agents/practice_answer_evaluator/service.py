from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.practice_answer_evaluator.graph import create_graph


@dataclass
class EvaluationResult:
    attempt_id: int
    is_correct: bool
    ai_response: str


class PracticeAnswerEvaluator:
    """Service pro vyhodnocení otevřené procvičovací odpovědi pomocí LangGraph."""

    def __init__(self, db: Session, user_question_id: int, user_input: str):
        self.db = db
        self.user_question_id = user_question_id
        self.user_input = user_input

    async def evaluate(self) -> EvaluationResult:
        app = create_graph()

        result = await app.ainvoke(
            {
                "db": self.db,
                "user_question_id": self.user_question_id,
                "user_input": self.user_input,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return EvaluationResult(
            attempt_id=result["attempt_id"],
            is_correct=result["is_correct"],
            ai_response=result["ai_response"],
        )
