"""Interakční formát „sokratovský dialog AI“ — kostra, zatím bez logiky.

Popis metodiky a návrhu: README.md v této složce.
Zatím NENÍ registrovaný v FORMATS (assessments/utils.py).
"""

from api.src.assessments.socratic_dialog_ai.schemas import (
    SocraticDialogAISettings as Settings,
    SocraticDialogAIState as State,
)
from api.src.assessments.socratic_dialog_ai.service import (
    evaluate_answer,
    initial_state,
    view,
)

# Odpověď student píše — submit_answer kontroluje rychlost psaní
TYPED_ANSWER = True

__all__ = ["Settings", "State", "evaluate_answer", "initial_state", "view"]
