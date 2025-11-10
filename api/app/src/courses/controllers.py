from sqlalchemy import Select, Sequence, select
from sqlalchemy.orm import Session

from app import models
from app.src.courses.schemas import CourseCreate
from app.src.courses.schemas import Course


def get_courses(db: Session) -> list[Course]:
    stm: Select[tuple[models.Course]] = select(models.Course)

    result: Sequence[tuple[models.Course]] = db.execute(stm).scalars().all()

    result: list[Course] = [Course.model_validate(course) for course in result]

    return result


def create_course(db: Session, course_data: CourseCreate) -> Course:
    course = models.Course(**course_data.model_dump())

    db.add(course)
    db.commit()
    db.refresh(course)

    return course
