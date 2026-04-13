from sqlalchemy.orm import Session

from api.models import CourseBlock, CourseSubject, CourseTarget


def get_course_blocks(db: Session) -> list[CourseBlock]:
    return db.query(CourseBlock).filter(CourseBlock.is_active.is_(True)).all()


def get_course_targets(db: Session) -> list[CourseTarget]:
    return db.query(CourseTarget).filter(CourseTarget.is_active.is_(True)).all()


def get_course_subjects(db: Session) -> list[CourseSubject]:
    return db.query(CourseSubject).filter(CourseSubject.is_active.is_(True)).all()
