"""Části promptu specifické pro cover kurzu; sdílený kánon je v prompt_template."""

from agents.image_generator.course.state import CourseContext
from agents.image_generator.prompt_template import (
    render_classification,
    render_system_prompt,
)

SETTING_KEY = "image_generator_prompt"

DEFAULT_PROMPT = render_system_prompt(
    intro="Navrhuješ cover (obrázek karty) pro vzdělávací kurz podle pevného designového systému.",
    unit="kurzu",
    motif_examples=(
        "Cover pro Git není logo Gitu, ale graf větví. "
        "Cover pro AI není robot, ale síť s prosvícenou cestou."
    ),
    tone_source=(
        "Obor ber primárně z pole PŘEDMĚT / OBOR (číselník), texty kurzu jsou až druhotné. "
        "KRAUU KOMPETENCE říkají, jakou činnost učitele kurz rozvíjí - využij je pro volbu "
        "mechanismu a schématu, nikdy je nekresli doslova (žádný text, žádné kódy)."
    ),
)


def render_user_prompt(context: CourseContext) -> str:
    """Sestaví user zprávu pro LLM z textů kurzu, jeho zařazení v číselnících a KRAUU kompetencí.

    Args:
        context: Kontext kurzu načtený z DB.
    """
    krauu_lines = "\n".join(f"- {line}" for line in context.krauu_competences) or "-"
    return (
        f"KURZ: {context.title}\n"
        f"POPIS: {context.description or '-'}\n"
        f"SHRNUTÍ: {context.summary or '-'}\n\n"
        f"{render_classification(context)}\n\n"
        f"KRAUU KOMPETENCE (co kurz u učitele rozvíjí):\n{krauu_lines}"
    )
