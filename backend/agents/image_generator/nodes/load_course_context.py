from sqlalchemy import select
from sqlalchemy.orm.session import Session

from api import models
from agents.image_generator.state import CourseContext, ImageGeneratorState


def load_course_context_node(state: ImageGeneratorState) -> ImageGeneratorState:
    """Node pro načtení kontextu kurzu (title, description, summary) z databáze."""
    print("Načítám kontext kurzu z databáze...")

    db: Session = state["db"]
    course_id: int = state["course_id"]

    course: models.Course | None = (
        db.execute(select(models.Course).where(models.Course.course_id == course_id))
        .scalars()
        .first()
    )

    if course is None:
        raise ValueError(f"Kurz s id {course_id} nebyl nalezn")

    state["course_context"] = CourseContext(
        title=course.title,
        description=course.description,
        summary=course.summary,
    )

    print(f"Načten kurz: {course.title}")

    return state
