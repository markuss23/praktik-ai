from datetime import datetime

from pydantic import Field, model_validator

from api.enums import AttachType, Difficulty, EduLevel, PubResourceStatus
from api.src.catalogs.schemas import (
    BloomLevel,
    CourseBlock,
    CourseEqfLevel,
    CourseLevel,
    CourseSubject,
    CourseTarget,
    CourseType,
    KrauuCompetence,
)
from api.src.common.schemas import ORMModel


class PubResourceBase(ORMModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    subject_id: int | None = None
    target_id: int | None = None
    education_level: EduLevel
    difficulty_level: Difficulty = Field(default=Difficulty.slightly_advanced)
    eqf_level_id: int
    course_type_id: int
    block_id: int | None = None
    level_id: int | None = None
    allow_forks: bool = False


KRAUU_IDS_FIELD = Field(
    min_length=1,
    description="ID KRAUU kompetencí (lze vybrat více; oblasti vybírat nelze)",
)

BLOOM_IDS_FIELD = Field(
    min_length=1,
    description="ID Bloomových úrovní (lze vybrat více)",
)


class PubResourceCreate(PubResourceBase):
    krauu_competence_ids: list[int] = KRAUU_IDS_FIELD
    bloom_level_ids: list[int] = BLOOM_IDS_FIELD


class PubResourceCreateFork(ORMModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class PubResourceUpdate(PubResourceBase):
    krauu_competence_ids: list[int] = KRAUU_IDS_FIELD
    bloom_level_ids: list[int] = BLOOM_IDS_FIELD


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
    eqf_level: CourseEqfLevel
    course_type: CourseType
    block: CourseBlock | None = None
    level: CourseLevel | None = None
    status: PubResourceStatus
    author_id: int
    allow_forks: bool
    is_fork: bool
    is_public: bool
    created_at: datetime


class PubResourceCommentCreate(ORMModel):
    """Vstup pro vytvoření komentáře ke schvalování materiálu."""

    comment: str = Field(min_length=1, max_length=2000)


class PubResourceComment(ORMModel):
    """Komentář garanta k materiálu (v rámci schvalování)."""

    comment_id: int
    resource_id: int
    author_id: int
    author_display_name: str | None = None
    comment: str
    created_at: datetime
    is_active: bool

    @model_validator(mode="before")
    @classmethod
    def fill_author_display_name(cls, value):
        """Vyplní author_display_name z navázaného ORM vztahu author."""
        if hasattr(value, "author") and value.author is not None:
            value.__dict__["author_display_name"] = value.author.display_name
        return value


class PubResource(PubResourceBase):
    resource_id: int
    author_id: int
    author_display_name: str
    is_active: bool
    is_public: bool
    status: PubResourceStatus
    is_fork: bool
    forked_from_id: int | None = None
    ratings_count: int = 0
    avg_rating: float | None = None
    files_count: int = 0
    forks_count: int = 0

    files: list[PubResourceFile] = []
    subject: CourseSubject | None = None
    target: CourseTarget | None = None
    eqf_level: CourseEqfLevel
    course_type: CourseType
    block: CourseBlock | None = None
    level: CourseLevel | None = None
    krauu_competences: list[KrauuCompetence] = Field(
        default=[], validation_alias="krauu_competence_list"
    )
    bloom_levels: list[BloomLevel] = Field(
        default=[], validation_alias="bloom_level_list"
    )
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_computed_fields(cls, obj):
        if hasattr(obj, "author"):
            obj.__dict__["author_display_name"] = obj.author.display_name
        return obj
