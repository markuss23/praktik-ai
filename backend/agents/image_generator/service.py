from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.image_generator.graph import create_graph
from agents.image_generator.state import CourseContext, CoverSpec, GeneratedImageResult


@dataclass
class ImageGenerationResult:
    course_context: CourseContext
    cover_spec: CoverSpec
    image_prompt: str
    results: list[GeneratedImageResult]


class ImageGeneratorService:
    """Service pro generování a porovnání obrázků kurzu pomocí LangGraph."""

    def __init__(self, db: Session, course_id: int, models_to_compare: list[str]):
        self.db = db
        self.course_id = course_id
        # Deduplikace se zachováním pořadí - stejný model 2x by v ZIPu přepsal sám sebe
        self.models_to_compare = list(dict.fromkeys(models_to_compare))

    async def generate(self) -> ImageGenerationResult:
        """Sestaví a spustí graf, vrátí kontext kurzu, prompt a výsledky všech modelů."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "course_id": self.course_id,
                "db": self.db,
                "models": self.models_to_compare,
            }
        )

        order = {name: i for i, name in enumerate(self.models_to_compare)}

        return ImageGenerationResult(
            course_context=result["course_context"],
            cover_spec=result["cover_spec"],
            image_prompt=result["image_prompt"],
            results=sorted(result["results"], key=lambda r: order.get(r.model_name, 0)),
        )
