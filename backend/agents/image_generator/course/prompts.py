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
        "Obor ber primárně z pole PŘEDMĚT / OBOR (číselník), texty kurzu jsou až druhotné."
    ),
)


def render_user_prompt(context: CourseContext) -> str:
    """Sestaví user zprávu pro LLM z textů kurzu a jeho zařazení v číselnících.

    Args:
        context: Kontext kurzu načtený z DB.
    """
    return (
        f"KURZ: {context.title}\n"
        f"POPIS: {context.description or '-'}\n"
        f"SHRNUTÍ: {context.summary or '-'}\n\n"
        f"{render_classification(context)}"
    )
