from typing import NotRequired

from agents.image_generator.state import ImageContext, ImageGeneratorState


class ModuleContext(ImageContext):
    """Kontext modulu načtený z DB, ze kterého se sestavuje image prompt.

    Číselníky (blok, cílová skupina, předmět) zděděné z ImageContext patří
    nadřazenému kurzu - modul sám zařazení nemá.
    """

    module_title: str
    learn_block_content: str | None
    course_title: str


class ModuleImageGeneratorState(ImageGeneratorState):
    module_id: int
    context: NotRequired[ModuleContext]
