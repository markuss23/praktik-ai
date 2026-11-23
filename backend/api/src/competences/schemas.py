from datetime import datetime

from pydantic import BaseModel

from api.enums import AssessmentContext


class CompetenceBase(BaseModel):
    krauu_id: int
    code: str
    name: str
    area_id: int | None
    area_code: str | None
    area_name: str | None


# ---------- Student ----------


class MyCompetenceSource(BaseModel):
    course_id: int
    course_title: str
    module_id: int | None
    module_title: str | None
    krauu_from_course: bool
    pretest_score: float | None
    outcome_score: float | None


class MyCompetenceHistoryItem(BaseModel):
    session_id: int
    context: AssessmentContext
    course_id: int
    module_id: int | None
    score: float
    finished_at: datetime
    # Z assessment_turn — null u sessions před zavedením zápisu turnů
    answers: int | None
    correct: int | None
    avg_elapsed_s: float | None


class MyCompetenceItem(CompetenceBase):
    pretest_score: float | None
    outcome_score: float | None
    delta: float | None
    sources: list[MyCompetenceSource]
    history: list[MyCompetenceHistoryItem]


# ---------- Admin ----------


class CompetenceStatsSource(BaseModel):
    course_id: int
    course_title: str
    module_id: int | None
    module_title: str | None
    krauu_from_course: bool
    pretest_users: int
    pretest_avg: float | None
    outcome_users: int
    outcome_avg: float | None


class CompetenceStatsItem(CompetenceBase):
    users: int
    pretest_users: int
    pretest_avg: float | None
    outcome_users: int
    outcome_avg: float | None
    paired_users: int
    paired_delta: float | None
    # Podíl správných odpovědí z assessment_turn (0–1), null bez dat
    answer_accuracy: float | None
    sources: list[CompetenceStatsSource]
