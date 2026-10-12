from sqlalchemy.orm import Session


def initial_state(db: Session, user, course_assessment, cfg):
    print(db, user, course_assessment, cfg)


def view():
    print("view")


def evaluate_answer():
    pass
