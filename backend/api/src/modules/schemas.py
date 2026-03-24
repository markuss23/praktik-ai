from datetime import datetime
from pydantic import Field
from api.src.common.schemas import ORMModel
from api.src.activities.schemas import LearnBlock, PracticeQuestion


class ModuleBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    max_task_attempts: int = Field(default=3, ge=1, le=20, description="Maximální počet pokusů pro splnění modulu")
    passing_score: int = Field(default=60, ge=0, le=100, description="Minimální skóre pro úspěšné splnění modulu (%)")


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


class ModuleCompletionStatus(ORMModel):
    module_id: int
    passed: bool = False
    score: int | None = None
    course_completed: bool = False
    task_session_status: str | None = None
    attempts_used: int = 0
    max_attempts: int = 0
    passing_score: int = 60


class CompleteModuleRequest(ORMModel):
    score: int = Field(ge=0, le=100, description="Test score percentage")


class ModuleAssessmentQuestion(ORMModel):
    session_id: int
    generated_task: str
    status: str
