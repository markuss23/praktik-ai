from sqlalchemy.orm import Session

from api.models import (
    CourseBlock,
    CourseEqfLevel,
    CourseRequirement,
    CourseSubject,
    CourseTarget,
    CourseType,
)


def get_course_blocks(db: Session) -> list[CourseBlock]:
    return db.query(CourseBlock).filter(CourseBlock.is_active.is_(True)).all()


def get_course_targets(db: Session) -> list[CourseTarget]:
    return db.query(CourseTarget).filter(CourseTarget.is_active.is_(True)).all()


def get_course_subjects(db: Session) -> list[CourseSubject]:
    return db.query(CourseSubject).filter(CourseSubject.is_active.is_(True)).all()


def get_course_requirements(db: Session) -> list[CourseRequirement]:
    return (
        db.query(CourseRequirement)
        .filter(CourseRequirement.is_active.is_(True))
        .all()
    )


def get_course_eqf_levels(db: Session) -> list[CourseEqfLevel]:
    return db.query(CourseEqfLevel).filter(CourseEqfLevel.is_active.is_(True)).all()


def get_course_types(db: Session) -> list[CourseType]:
    return db.query(CourseType).filter(CourseType.is_active.is_(True)).all()
