"""Interakční formát „uzavřené otázky“.

Rozhraní formátu (stejné pro každý formát v FORMATS v assessments/utils.py),
vše Pydantic:
    Settings          schéma `settings` (JSONB na course_assessment)
    Result            schéma stavu běhu (JSONB `session.result`)
    initial_result    počáteční Result
    view              co student právě vidí (pole SessionStartResponse)
    evaluate_answer   vyhodnotí odpověď -> AnswerOutcome (assessments/outcome.py)
"""

from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionsResult as Result,
    ClosedQuestionsSettings as Settings,
)
from api.src.assessments.closed_questions.service import (
    evaluate_answer,
    initial_result,
    view,
)

__all__ = ["Result", "Settings", "evaluate_answer", "initial_result", "view"]
