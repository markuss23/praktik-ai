from dataclasses import dataclass

from sqlalchemy.orm import Session

from api.src.assessments.open_question_ai.agents.evaluator.graph import create_graph


@dataclass
class EvaluationResult:
    ai_response: str
    score: float


class OpenQuestionAIEvaluator:
    """Service pro vyhodnocení otevřené procvičovací odpovědi pomocí LangGraph."""

    def __init__(self, db: Session, module_id: int, answer: str, question: str):
        self.db = db
        self.module_id = module_id
        self.answer = answer
        self.question = question

    async def evaluate(self) -> EvaluationResult:
        app = create_graph()

        result = await app.ainvoke(
            {
                "db": self.db,
                "module_id": self.module_id,
                "answer": self.answer,
                "question": self.question,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return EvaluationResult(
            ai_response=result["ai_response"],
            score=result["score"],
        )
