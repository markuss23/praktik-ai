from typing import NotRequired

from agents.image_generator.state import ImageContext, ImageGeneratorState


class CourseContext(ImageContext):
    """Kontext kurzu načtený z DB, ze kterého se sestavuje image prompt coveru.

    Kromě textů kurzu obsahuje i číselníky (blok, cílová skupina, předmět)
    zděděné z ImageContext, podle kterých LLM volí obor a tón.
    """

    title: str
    description: str | None
    summary: str | None


class CourseImageGeneratorState(ImageGeneratorState):
    course_id: int
    context: NotRequired[CourseContext]
