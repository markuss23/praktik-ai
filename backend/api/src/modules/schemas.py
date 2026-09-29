from datetime import datetime
from pydantic import Field, model_validator
from api.src.common.schemas import ORMModel
from api.src.activities.schemas import LearnBlock, PracticeQuestion
from api.src.catalogs.schemas import NeuroPrinciple


class ModuleBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    perex: str = Field(default="", max_length=255)
    max_task_attempts: int = Field(default=3, ge=1, le=20, description="Maximální počet pokusů pro splnění modulu")
    neuro_principle_ids: list[int] = Field(
        min_length=1,
        description="ID neurovědních principů navázaných na modul (lze vybrat více, alespoň jeden)",
    )


class ModuleCreate(ModuleBase):
    course_id: int = Field(description="FK na course.course_id")


class ModuleUpdate(ModuleBase):
    # is_active: bool = True
    pass


class Module(ModuleBase):
    module_id: int
    course_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    learn_blocks: list[LearnBlock] = []
    practice_questions: list[PracticeQuestion] = []
    neuro_principles: list[NeuroPrinciple] = []

    @model_validator(mode="before")
    @classmethod
    def populate_neuro_principles(cls, obj):
        if hasattr(obj, "__dict__") and hasattr(obj, "neuro_principles"):
            try:
                principles = [link.principle for link in obj.neuro_principles]
                obj.__dict__["neuro_principles"] = principles
                obj.__dict__["neuro_principle_ids"] = [
                    p.principle_id for p in principles
                ]
            except Exception:
                pass
        return obj


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
