from sqlalchemy import select
from sqlalchemy.orm.session import Session

from agents.image_generator.course.state import CourseContext, CourseImageGeneratorState
from api import models


def load_course_context_node(
    state: CourseImageGeneratorState,
) -> CourseImageGeneratorState:
    """Node pro načtení kontextu kurzu (title, description, summary, číselníky) z databáze."""
    print("Načítám kontext kurzu z databáze...")

    db: Session = state["db"]
    course_id: int = state["course_id"]

    course: models.Course | None = (
        db.execute(select(models.Course).where(models.Course.course_id == course_id))
        .scalars()
        .first()
    )

    if course is None:
        raise ValueError(f"Kurz s id {course_id} nebyl nalezen")

    block = course.course_block
    target = course.course_target
    subject = course.course_subject

    state["context"] = CourseContext(
        title=course.title,
        description=course.description,
        summary=course.summary,
        block_name=block.name if block else None,
        block_description=block.description if block else None,
        target_name=target.name if target else None,
        target_description=target.description if target else None,
        subject_name=subject.name if subject else None,
    )

    print(f"Načten kurz: {course.title}")

    return state
