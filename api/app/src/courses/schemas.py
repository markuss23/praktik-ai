from pydantic import Field

from app.src.common.schemas import ORMModel


class CourseBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    is_published: bool = False
    is_active: bool = True


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    pass


class Course(CourseBase):
    course_id: int
