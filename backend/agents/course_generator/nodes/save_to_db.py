from sqlalchemy import Update, update
from sqlalchemy.orm.session import Session

from agents.course_generator.state import AgentState, Course as GeneratedCourse
from api import models


def save_to_db_node(state: AgentState) -> AgentState:
    """Node pro uložení vygenerovaného kurzu do databáze."""
    print("Ukládání kurzu do databáze...")

    course_id: int = state.get("course_id")
    db: Session = state.get("db")
    generated_course: GeneratedCourse | None = state.get("course")
    summary: str = state.get("summarize_content")

    if course_id is None:
        raise ValueError("course_id is not available in state")

    if db is None:
        raise ValueError("db session is not available in state")

    if generated_course is None:
        raise ValueError("generated course is not available in state")

    # Označení kurzu jako vygenerovaný
    stmt: Update = (
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(is_generated=True, summary=summary)
    )
    db.execute(stmt)

    db.commit()

    print(f"   -> Kurz uložen do databáze (course_id: {course_id})")
    print(f"   -> Vytvořeno {len(generated_course.modules)} modulů")

    return state
