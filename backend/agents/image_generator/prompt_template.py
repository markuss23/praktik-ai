"""Pevná část image promptu podle designového systému coverů (module-covers.md).

LLM rozhoduje jen o proměnných (CoverSpec); styl, kompozice a negace jsou
napevno tady, aby byl prompt pro všechny porovnávané modely identický.
"""

from agents.image_generator.state import CoverSpec

# Hexy jsou orientační hodnoty tokenů z module-covers.md (image modely tokeny neznají).
# Slovní název barvy je před hexem schválně - image modely drží názvy barev
# mnohem spolehlivěji než hex kódy.
TONE_COLORS: dict[str, tuple[str, str]] = {
    "purple": ("soft lavender purple (#857AD2)", "bright orange (#F87B1B)"),
    "green": ("fresh medium green (#59AC77)", "warm yellow (#F5C542)"),
    "blue": ("vivid royal blue (#383BF5)", "bright orange (#F87B1B)"),
    "rose": ("deep rose red (#B1475C)", "warm yellow (#F5C542)"),
    "orange": ("bright orange (#F87B1B)", "vivid royal blue (#383BF5)"),
}

COVER_PROMPT_TEMPLATE = (
    "Flat vector cover illustration, wide landscape banner, single solid {background} "
    "background filling the entire canvas, no gradient, no texture, no grid. "
    "The background must be exactly {background} - never black, dark gray, white or any other color.\n"
    "White 3px line-art diagram showing how {mechanism}, rounded caps and joins, no filled shapes.\n"
    "Left third: {left_object}. Right two thirds: {right_schema}.\n"
    "Exactly one element highlighted in {accent} as the focal point: {accent_element}.\n"
    "Generous empty space, a few small white dots in empty corners.\n"
    "Keep all drawing in the central safe area, edges may be cropped.\n"
    "No text, no letters, no logos, no shadows, no 3D, no photorealism."
)


def render_cover_prompt(spec: CoverSpec) -> str:
    """Dosadí CoverSpec do šablony a vrátí finální prompt pro image model.

    Args:
        spec: Proměnné části coveru vybrané LLM (mechanismus, objekt, schéma, akcent, tón).
    """
    background, accent = TONE_COLORS[spec.tone]
    # Věta se dosazuje za "showing how", takže bez velkého písmene a koncové tečky.
    mechanism = spec.mechanism.strip().rstrip(".")
    mechanism = mechanism[:1].lower() + mechanism[1:]
    return COVER_PROMPT_TEMPLATE.format(
        background=background,
        accent=accent,
        mechanism=mechanism,
        left_object=spec.left_object,
        right_schema=spec.right_schema,
        accent_element=spec.accent_element,
    )
