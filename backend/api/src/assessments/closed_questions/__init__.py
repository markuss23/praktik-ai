"""Interakční formát „uzavřené otázky“.

Rozhraní formátu (stejné pro každý formát v FORMATS v assessments/utils.py),
vše Pydantic:
    Settings          schéma `settings` (JSONB na course_assessment)
    State             schéma stavu běhu (JSONB `session.state`)
    initial_state     počáteční State
    view              co student právě vidí (pole SessionStartResponse)
    evaluate_answer   vyhodnotí odpověď -> AnswerOutcome (assessments/outcome.py)

Volitelně:
    TYPED_ANSWER      True = odpověď se píše, submit_answer odmítne vložený
                      text (typed_too_fast); předchozí odpověď čte ze
                      state.last_answer. Může být i funkce (state) -> bool,
                      když se píše jen u některých otázek (pretest)
"""

from api.src.assessments.closed_questions.schemas import (
    ClosedQuestionsState as State,
    ClosedQuestionsSettings as Settings,
)
from api.src.assessments.closed_questions.service import (
    evaluate_answer,
    initial_state,
    view,
)

__all__ = ["State", "Settings", "evaluate_answer", "initial_state", "view"]
