from datetime import datetime

from pydantic import Field, model_validator

from api.enums import AttachType, Difficulty, EduLevel, PubResourceStatus
from api.src.catalogs.schemas import CourseSubject, CourseTarget
from api.src.common.schemas import ORMModel


class PubResourceBase(ORMModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    subject_id: int | None = None
    target_id: int | None = None
    education_level: EduLevel
    difficulty_level: Difficulty = Field(default=Difficulty.slightly_advanced)
    allow_forks: bool = False


class PubResourceCreate(PubResourceBase):
    pass


class PubResourceCreateFork(ORMModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    allow_forks: bool = False


class PubResourceUpdate(PubResourceBase):
    pass


class PubResourceFile(ORMModel):
    """Schema pro soubor materiálu"""

    file_id: int
    resource_id: int
    filename: str
    file_path: str
    file_type: AttachType


class PubResourceCreated(ORMModel):
    """Zkrácená response po vytvoření materiálu"""

    resource_id: int
    title: str
    description: str | None = None
    education_level: EduLevel
    difficulty_level: Difficulty
    status: PubResourceStatus
    author_id: int
    allow_forks: bool
    is_fork: bool
    is_public: bool
    created_at: datetime


class PubResource(PubResourceBase):
    resource_id: int
    author_id: int
    author_display_name: str | None = None
    is_active: bool
    is_public: bool
    status: PubResourceStatus
    is_fork: bool
    forked_from_id: int | None = None
    created_at: datetime
    updated_at: datetime
    ratings_count: int = 0
    files_count: int = 0
    forks_count: int = 0

    files: list[PubResourceFile] = []
    subject: CourseSubject | None = None
    target: CourseTarget | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_computed_fields(cls, obj):
        if hasattr(obj, "__dict__"):
            author = getattr(obj, "author", None)
            if author is not None:
                try:
                    obj.__dict__["author_display_name"] = author.display_name
                except Exception:
                    pass
        return obj
