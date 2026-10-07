from datetime import datetime
from pydantic import Field
from api.src.common.schemas import ORMModel
from api.src.activities.schemas import LearnBlock, PracticeQuestion
from api.src.catalogs.schemas import BloomLevel, KrauuCompetence, NeuroPrinciple


class ModuleBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    perex: str = Field(default="", max_length=255)
    max_task_attempts: int = Field(default=3, ge=1, le=20, description="Maximální počet pokusů pro splnění modulu")
    neuro_principle_ids: list[int] = Field(
        min_length=1,
        description="ID neurovědních principů navázaných na modul (lze vybrat více, alespoň jeden)",
    )


BLOOM_IDS_FIELD = Field(
    min_length=1,
    description="ID Bloomových úrovní (lze vybrat více, alespoň jedna)",
)

KRAUU_IDS_FIELD = Field(
    min_length=1,
    description="ID KRAUU kompetencí (lze vybrat více, alespoň jedna; oblasti vybírat nelze)",
)


class ModuleCreate(ModuleBase):
    course_id: int = Field(description="FK na course.course_id")
    krauu_competence_ids: list[int] = KRAUU_IDS_FIELD
    bloom_level_ids: list[int] = BLOOM_IDS_FIELD


class ModuleUpdate(ModuleBase):
    # is_active: bool = True
    krauu_competence_ids: list[int] = KRAUU_IDS_FIELD
    bloom_level_ids: list[int] = BLOOM_IDS_FIELD


class Module(ModuleBase):
    module_id: int
    course_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    learn_blocks: list[LearnBlock] = []
    practice_questions: list[PracticeQuestion] = []
    neuro_principle_ids: list[int] = Field(validation_alias="neuro_principle_id_list")
    neuro_principles: list[NeuroPrinciple] = Field(
        default=[], validation_alias="neuro_principle_list"
    )
    krauu_competences: list[KrauuCompetence] = Field(
        default=[], validation_alias="krauu_competence_list"
    )
    bloom_levels: list[BloomLevel] = Field(
        default=[], validation_alias="bloom_level_list"
    )


class ModuleCompletionStatus(ORMModel):
    module_id: int
    passed: bool = False
    score: int | None = None
    course_completed: bool = False
    task_session_status: str | None = None
    attempts_used: int = 0
    max_attempts: int = 0
    passing_score: int = 75


class CompleteModuleRequest(ORMModel):
    score: int = Field(ge=0, le=100, description="Test score percentage")


class AssessmentAttemptDetail(ORMModel):
    attempt_id: int
    ai_score: int
    is_passed: bool
    ai_feedback: str | None = None


class ModuleAssessmentQuestion(ORMModel):
    session_id: int
    generated_task: str
    status: str
    attempts_used: int = 0
    max_attempts: int = 3
    attempts: list[AssessmentAttemptDetail] = []
