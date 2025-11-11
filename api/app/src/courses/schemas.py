from pydantic import Field

from app.src.common.schemas import ORMModel


class CourseBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    is_published: bool = False


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    is_active: bool = True


class Course(CourseBase):
    course_id: int
    is_active: bool
