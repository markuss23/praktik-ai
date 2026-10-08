"""Části promptu specifické pro obrázek modulu; sdílený kánon je v prompt_template."""

from agents.image_generator.module.state import ModuleContext
from agents.image_generator.prompt_template import (
    render_classification,
    render_system_prompt,
)

SETTING_KEY = "module_image_generator_prompt"

DEFAULT_PROMPT = render_system_prompt(
    intro=(
        "Navrhuješ ilustrační obrázek pro jeden modul vzdělávacího kurzu podle pevného "
        "designového systému."
    ),
    unit="modulu",
    motif_examples=(
        "Modul o Gitu nemá cover s logem Gitu, ale graf větví. "
        "Modul o AI nemá robota, ale síť s prosvícenou cestou."
    ),
    extra_rules=[
        (
            "Motiv vycházej primárně z OBSAHU MODULU (název + text), nikoli z celého kurzu - modul "
            "je jen jedna dílčí část kurzu a obrázek má odpovídat právě jí."
        ),
    ],
    tone_source=(
        "Obor ber z kontextu kurzu (PŘEDMĚT / OBOR, BLOK), texty modulu jsou až druhotné."
    ),
)


def render_user_prompt(context: ModuleContext) -> str:
    """Sestaví user zprávu pro LLM z názvu a obsahu modulu a zařazení kurzu v číselnících.

    Args:
        context: Kontext modulu načtený z DB.
    """
    return (
        f"KURZ: {context.course_title}\n"
        f"MODUL: {context.module_title}\n"
        f"OBSAH MODULU: {context.learn_block_content or '-'}\n\n"
        f"{render_classification(context)}"
    )
