"""
Interakční formáty (assessments) — rozšiřitelný systém testování/procvičování
v kurzech. Viz base.py pro kontrakt formátu a registr.

Import každého formátu tady stačí k jeho zaregistrování (dekorátor @register
v jeho service.py se spustí při importu balíčku).
"""

from agents.assessments import closed_questions  # noqa: F401
