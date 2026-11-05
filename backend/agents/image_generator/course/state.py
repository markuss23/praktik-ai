from typing import NotRequired

from agents.image_generator.state import ImageContext, ImageGeneratorState


class CourseContext(ImageContext):
    """Kontext kurzu načtený z DB, ze kterého se sestavuje image prompt coveru.

    Kromě textů kurzu obsahuje i číselníky (blok, cílová skupina, předmět)
    zděděné z ImageContext, podle kterých LLM volí obor a tón, a KRAUU
    kompetence kurzu, které napovídají, jakou činnost učitele má cover zachytit.
    """

    title: str
    description: str | None
    summary: str | None
    # Řádky "kód název - popis" kompetencí KRAUU navázaných na kurz
    krauu_competences: list[str] = []


class CourseImageGeneratorState(ImageGeneratorState):
    course_id: int
    context: NotRequired[CourseContext]
