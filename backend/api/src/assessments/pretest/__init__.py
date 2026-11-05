"""Interakční formát „pretest“ — první stupeň před practice.

Otázky (2 uzavřené + 1 otevřená) jsou v course_assessment.settings, uloží je
tam generátor kurzu. Pravidla jsou pevná. Rozhraní viz closed_questions/__init__.py.
"""

from api.src.assessments.pretest.schemas import (
    PretestSettings as Settings,
    PretestState as State,
)
from api.src.assessments.pretest.service import (
    TYPED_ANSWER,
    evaluate_answer,
    initial_state,
    view,
)

__all__ = ["Settings", "State", "TYPED_ANSWER", "evaluate_answer", "initial_state", "view"]
