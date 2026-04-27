from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm.session import Session

from api import models
from api.src.agents.progress import set_progress
from agents.course_generator.state import AgentState, CourseInput


def load_data_from_db_node(state: AgentState) -> AgentState:
    """Node pro načtení dat kurzu z databáze."""
    print("Načítám data kurzu z databáze...")

    db: Session = state.get("db")
    course_id: int = state["course_id"]
    set_progress(course_id, step=1, label="Načítání kurzu z databáze")

    if db is None:
        raise ValueError("Database session is not available in state")

    # Načti kurz z DB
    course = (
        db.execute(select(models.Course).where(models.Course.course_id == course_id))
        .scalars()
        .first()
    )

    if course is None:
        raise ValueError(f"Course with id {course_id} not found")

    # Načti soubory kurzu
    files: Sequence[models.CourseFile] = (
        db.execute(
            select(models.CourseFile).where(models.CourseFile.course_id == course_id)
        )
        .scalars()
        .all()
    )

    file_paths: list[str] = [f.file_path for f in files]

    # Ulož do state
    state["course_input"] = CourseInput(
        title=course.title,
        description=course.description,
        modules_count_ai_generated=course.modules_count_ai_generated,
        files=file_paths,
    )

    print(f"   -> Načten kurz: {course.title}")
    print(f"   -> Počet modulů: {course.modules_count_ai_generated}")
    print(f"   -> Počet souborů: {len(file_paths)}")

    return state
