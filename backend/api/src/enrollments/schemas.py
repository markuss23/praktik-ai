from datetime import datetime

from api.src.common.schemas import ORMModel
from api.enums import UserRole


class EnrollmentCreate(ORMModel):
    user_id: int
    course_id: int


class EnrollmentUser(ORMModel):
    user_id: int
    email: str
    display_name: str | None
    role: UserRole


class EnrollmentCourse(ORMModel):
    course_id: int
    title: str


class Enrollment(ORMModel):
    enrollment_id: int
    user_id: int
    course_id: int
    completed_at: datetime | None
    left_at: datetime | None
    created_at: datetime
    updated_at: datetime
    user: EnrollmentUser
    course: EnrollmentCourse
