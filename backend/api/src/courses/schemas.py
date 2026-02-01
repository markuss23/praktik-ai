from pydantic import Field

from api.src.modules.schemas import Module
from api.src.common.schemas import ORMModel
from api.enums import Status


class CourseBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    modules_count: int = 3
    category_id: int


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    pass


class CourseFile(ORMModel):
    """Schema pro soubor kurzu"""

    file_id: int
    course_id: int
    filename: str
    file_path: str


class CourseLink(ORMModel):
    """Schema pro odkaz kurzu"""

    link_id: int
    course_id: int
    url: str


class Course(CourseBase):
    course_id: int
    is_active: bool
    is_published: bool = False
    status: Status
    summary: str | None = None

    modules: list[Module] = []
    files: list[CourseFile] = []
    links: list[CourseLink] = []
