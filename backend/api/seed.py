from sqlalchemy.orm import Session

from api.database import SessionLocal
from api.models import CourseBlock, CourseSubject, CourseTarget

COURSE_BLOCKS: list[dict[str, str]] = [
    {"code": "a", "name": "Kontext", "description": "Porozumění principům AI"},
    {"code": "b", "name": "Transformace", "description": "Redesign výuky a hodnocení"},
    {"code": "c", "name": "Aplikace", "description": "Oborové kurzy"},
]

COURSE_TARGETS: list[dict[str, str]] = [
    {"code": "a", "name": "Akademik", "description": "Vysokoškolský pedagog"},
    {
        "code": "s",
        "name": "Student",
        "description": "Student učitelství / teacher trainee",
    },
    {"code": "m", "name": "Mentor", "description": "Fakultní učitel / mentor praxe"},
    {"code": "h", "name": "Host", "description": "Externí účastník"},
]

COURSE_SUBJECTS: list[dict[str, str]] = [
    {"code": "01", "name": "Český jazyk a literatura"},
    {"code": "02", "name": "Cizí jazyky – obecné"},
    {"code": "03", "name": "Angličtina"},
    {"code": "04", "name": "Němčina"},
    {"code": "05", "name": "Primární vzdělávání"},
    {"code": "06", "name": "Tělesná výchova"},
    {"code": "07", "name": "Hudební výchova"},
    {"code": "08", "name": "Výtvarná výchova"},
    {"code": "09", "name": "Dramatická výchova"},
    {"code": "10", "name": "Dějepis"},
    {"code": "11", "name": "Společenské vědy"},
    {"code": "12", "name": "Občanská výchova a etika"},
    {"code": "13", "name": "Ochrana obyvatelstva"},
    {"code": "14", "name": "Mediální výchova"},
]


def seed_db() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(CourseBlock).count() == 0:
            db.add_all([CourseBlock(**row) for row in COURSE_BLOCKS])

        if db.query(CourseTarget).count() == 0:
            db.add_all([CourseTarget(**row) for row in COURSE_TARGETS])

        if db.query(CourseSubject).count() == 0:
            db.add_all([CourseSubject(**row) for row in COURSE_SUBJECTS])

        db.commit()
    finally:
        db.close()
