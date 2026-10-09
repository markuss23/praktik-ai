"""Interakční formát „uzavřené otázky“.

Rozhraní formátu (stejné pro každý formát v FORMATS v assessments/utils.py):
    Settings          Pydantic schéma `settings` (JSONB na course_assessment)
    initial_result    počáteční stav běhu do `session.result`
    view              co student právě vidí (pole SessionStartResponse)
    evaluate_answer   vyhodnotí odpověď -> AnswerOutcome
"""

from api.src.assessments.closed_questions.settings import (
    ClosedQuestionsSettings as Settings,
)
from api.src.assessments.closed_questions.service import (
    evaluate_answer,
    initial_result,
    view,
)

__all__ = ["Settings", "evaluate_answer", "initial_result", "view"]
