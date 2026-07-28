"""
Interakční formáty (assessments) — rozšiřitelný systém testování/procvičování
v kurzech. Viz base.py pro sdílené nástroje a tvar REGISTRY.

Tady se REGISTRY ručně vyplní — jeden řádek na jeden formát. Nový formát
= naimportovat jeho settings/service a přidat další řádek do dictu.
"""

from agents.assessments.base import REGISTRY
from agents.assessments.closed_questions import service as closed_questions_service
from agents.assessments.closed_questions.settings import ClosedQuestionsSettings

REGISTRY["closed_questions"] = {
    "settings_schema": ClosedQuestionsSettings,
    "start": closed_questions_service.start,
    "handle_turn": closed_questions_service.handle_turn,
    "current_view": closed_questions_service.current_view,
}
