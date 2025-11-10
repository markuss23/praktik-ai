from sqlalchemy import select
from sqlalchemy.orm import Session

from app.src.courses.schemas import CourseCreate
from app.models import Course


def get_courses(db: Session):
    stm = select(Course)

    result = db.execute(stm).scalars().all()

    return result


def create_course(db: Session, course_data: CourseCreate) -> Course:
    print(course_data)
    course = Course(**course_data.model_dump())

    db.add(course)
    db.commit()
    db.refresh(course)

    return course
