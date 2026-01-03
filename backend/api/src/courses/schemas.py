
from pydantic import Field

from api.src.modules.schemas import Module
from api.src.common.schemas import ORMModel


class CourseBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    is_published: bool = False


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    is_active: bool = True


class CourseFile(ORMModel):
    """Schema pro soubor kurzu"""

    file_id: int
    course_id: int
    filename: str
    file_path: str


class Course(CourseBase):
    course_id: int
    is_active: bool

    modules: list[Module]
    files: list[CourseFile] = []
