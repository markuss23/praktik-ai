"""Pevná část image promptu pro obrázky modulů.

Sdílí designový systém (barvy tónů, šablonu kompozice) se
`agents.image_generator.prompt_template` - LLM u modulu rozhoduje o stejné
sadě proměnných (ModuleImageSpec == CoverSpec), jen kontext, ze kterého
vychází, je užší (obsah modulu místo celého kurzu).
"""

from agents.image_generator.prompt_template import (
    COVER_PROMPT_TEMPLATE,
    TONE_COLORS,
)
from agents.module_image_generator.state import ModuleImageSpec


def render_module_prompt(spec: ModuleImageSpec) -> str:
    """Dosadí ModuleImageSpec do sdílené šablony a vrátí finální prompt pro image model."""
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
