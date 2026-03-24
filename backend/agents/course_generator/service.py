from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.course_generator.graph import create_graph
from agents.course_generator.state import CourseGenerated


@dataclass
class CourseGenerationResult:
    title: str
    modules: list[dict]


class CourseGeneratorService:
    """Service pro generování kurzu pomocí LangGraph."""

    def __init__(self, db: Session, course_id: int):
        self.db = db
        self.course_id = course_id

    async def generate(self) -> CourseGenerationResult:
        """Sestaví a spustí graf, vrátí vygenerovaný kurz."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "course_id": self.course_id,
                "db": self.db,
            }
        )

        course: CourseGenerated = result["course"]

        return CourseGenerationResult(
            title=course.title,
            modules=[module.model_dump() for module in course.modules],
        )
