from datetime import date, datetime

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


class MyEnrollmentCourse(ORMModel):
    course_id: int
    title: str
    description: str | None = None
    modules_count: int = 0


class MyEnrollmentNextModule(ORMModel):
    """První dosud neudělaný modul kurzu (vč. pozice 1..N)."""

    module_id: int
    title: str
    index: int
    total: int


class MyEnrollment(ORMModel):
    enrollment_id: int
    course_id: int
    course: MyEnrollmentCourse
    completed_modules: int = 0
    total_modules: int = 0
    enrolled_at: datetime
    completed_at: datetime | None = None

    # Server-side resume cíl. None znamená „kurz dokončen" nebo „nic neaktivního".
    next_module: MyEnrollmentNextModule | None = None

    # Naposledy otevřený modul (může lišit od next_module pokud user skočil zpátky).
    last_visited_module_id: int | None = None
    # Nejnovější aktivita v rámci kurzu (visit modulu, dokončení testu, …).
    last_activity_at: datetime | None = None


class ActivityDay(ORMModel):
    """Jeden den v heat mapě aktivity."""

    date: date
    count: int
    # Volné slovní popisky (názvy kurzů/modulů) pro tooltip — max ~3.
    titles: list[str] = []


class ActivityResponse(ORMModel):
    days: list[ActivityDay]
    from_date: date
    to_date: date
