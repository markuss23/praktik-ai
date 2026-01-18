from sqlalchemy import Update, update
from sqlalchemy.orm.session import Session

from agents.course_generator.state import AgentState, Course as GeneratedCourse
from api import models


def save_to_db_node(state: AgentState) -> AgentState:
    """Node pro uložení vygenerovaného kurzu do databáze."""
    print("Ukládání kurzu do databáze...")

    course_id: int = state.get("course_id")
    db: Session = state.get("db")
    generated_course: GeneratedCourse | None = state.get("course")
    summary: str = state.get("summarize_content")

    if course_id is None:
        raise ValueError("course_id is not available in state")

    if db is None:
        raise ValueError("db session is not available in state")

    if generated_course is None:
        raise ValueError("generated course is not available in state")

    # Označení kurzu jako vygenerovaný (ale ponecháme draft pro možnost editace)
    stmt: Update = (
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(status="draft", summary=summary)
    )

    db.execute(stmt)

    # Uložení modulů
    for module in generated_course.modules:
        db_module = models.Module(
            course_id=course_id,
            title=module.title,
            position=module.position,
            is_active=True,
        )
        db.add(db_module)
        db.flush()  # Získání module_id před přidáním learn_blocks a practices

        # Uložení learn_blocks
        for lb in module.learn_blocks:
            db_learn_block = models.LearnBlock(
                module_id=db_module.module_id,
                content=lb.content,
                position=lb.position,
            )
            db.add(db_learn_block)

        # Uložení practices
        for pr in module.practices:
            db_practice = models.Practice(
                module_id=db_module.module_id,
                position=pr.position,
            )
            db.add(db_practice)
            db.flush()  # Získání practice_id před přidáním questions

            # Uložení otázek
            for q in pr.questions:
                db_question = models.PracticeQuestion(
                    practice_id=db_practice.practice_id,
                    question_type=q.question_type.value,
                    question=q.question,
                    position=q.position,
                    correct_answer=q.correct_answer if q.question_type.value == "closed" else None,
                    example_answer=q.example_answer if q.question_type.value == "open" else None,
                )
                db.add(db_question)
                db.flush()  # Získání question_id před přidáním options/keywords

                if q.question_type.value == "closed":
                    for opt in q.closed_options:
                        db_option = models.PracticeOption(
                            question_id=db_question.question_id,
                            text=opt.text,
                            position=opt.position,
                        )
                        db.add(db_option)
                elif q.question_type.value == "open":
                    for kw in q.open_keywords:
                        db_keyword = models.QuestionKeyword(
                            question_id=db_question.question_id,
                            keyword=kw.keyword,
                        )
                        db.add(db_keyword)

    db.commit()

    print(f"   -> Kurz uložen do databáze (course_id: {course_id})")
    print(f"   -> Vytvořeno {len(generated_course.modules)} modulů")

    return state
