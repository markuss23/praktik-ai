from pydantic import Field, model_validator

from api.src.modules.schemas import Module
from api.src.common.schemas import ORMModel
from api.enums import Status
from api.src.catalogs.schemas import CourseBlock, CourseTarget, CourseSubject


class CourseBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    course_block_id: int
    course_target_id: int
    course_subject_id: int | None = None
    modules_count_ai_generated: int = Field(default=3, ge=1, le=20)
    min_modules_to_open_final_exam: int = Field(default=1, ge=1)
    duration_minutes: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_min_modules(self) -> "CourseBase":
        if self.min_modules_to_open_final_exam > self.modules_count_ai_generated:
            raise ValueError(
                "min_modules_to_open_final_exam nesmí být větší než modules_count_ai_generated"
            )
        return self


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


class CourseCreated(ORMModel):
    """Zkrácená response po vytvoření kurzu"""

    title: str
    description: str | None = None
    modules_count_ai_generated: int
    min_modules_to_open_final_exam: int
    duration_minutes: int | None = None
    course_id: int
    owner_id: int
    is_published: bool
    status: Status
    course_block: CourseBlock
    course_target: CourseTarget
    course_subject: CourseSubject


class Course(CourseBase):
    course_id: int
    owner_id: int
    owner_display_name: str | None = None
    is_active: bool
    is_published: bool = False
    status: Status
    modules_count: int = 0

    # modules: list[Module] = []
    files: list[CourseFile] = []
    links: list[CourseLink] = []
    course_block: CourseBlock | None = None
    course_target: CourseTarget | None = None
    course_subject: CourseSubject | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_computed_fields(cls, obj):
        if hasattr(obj, "__dict__"):
            if hasattr(obj, "modules"):
                try:
                    obj.__dict__["modules_count"] = len(obj.modules)
                except Exception:
                    pass
            owner = getattr(obj, "owner", None)
            if owner is not None:
                try:
                    obj.__dict__["owner_display_name"] = owner.display_name
                except Exception:
                    pass
        return obj


class CourseDetail(Course):
    """Detailní response kurzu včetně modulů (GET /courses/{id})"""

    modules: list[Module] = []
