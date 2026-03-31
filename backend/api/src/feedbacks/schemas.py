from datetime import datetime

from api.src.catalogs.schemas import CourseBlock, CourseTarget, CourseSubject
from api.src.common.schemas import ORMModel
from api.enums import Status


class FeedbackAuthor(ORMModel):
    user_id: int
    display_name: str | None


class FeedbackModule(ORMModel):
    module_id: int
    title: str


class FeedbackCourse(ORMModel):
    course_id: int
    title: str
    status: Status
    modules_count_ai_generated: int
    min_modules_to_open_final_exam: int
    course_block: CourseBlock | None = None
    course_target: CourseTarget | None = None
    course_subject: CourseSubject | None = None


class FeedbackItem(ORMModel):
    feedback_id: int
    feedback: str
    reply: str | None
    is_resolved: bool
    module_id: int | None
    content_type: str | None
    content_ref: str | None
    module: FeedbackModule | None = None
    author: FeedbackAuthor
    created_at: datetime


class FeedbackSection(ORMModel):
    course: FeedbackCourse
    feedbacks: list[FeedbackItem]


class FeedbackCreate(ORMModel):
    course_id: int
    feedback: str
    module_id: int | None = None
    content_type: str | None = None
    content_ref: str | None = None


class FeedbackReply(ORMModel):
    reply: str


class FeedbackResolve(ORMModel):
    is_resolved: bool
