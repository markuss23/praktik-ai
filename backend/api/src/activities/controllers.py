from fastapi import HTTPException
from sqlalchemy import select, update, and_
from sqlalchemy.orm import Session

from api import models
from api.src.common.utils import get_or_404, assert_course_editable
from api.src.activities.schemas import (
    LearnBlock,
    LearnBlockCreate,
    LearnBlockUpdate,
    PracticeQuestion,
    PracticeQuestionCreate,
    PracticeQuestionUpdate,
    PracticeOption,
    PracticeOptionCreate,
    PracticeOptionUpdate,
    QuestionKeyword,
    QuestionKeywordCreate,
    QuestionKeywordUpdate,
)
from api.authorization import validate_owner_or_superadmin


# ---------- LearnBlock ----------


def create_learn_block(
    db: Session, learn_data: LearnBlockCreate, user: models.User
) -> LearnBlock:
    """Vytvoří LearnBlock — modul smí mít nejvýše jeden aktivní."""
    module = get_or_404(db, models.Module, learn_data.module_id, detail="Modul nenalezen nebo není aktivní")

    validate_owner_or_superadmin(module, user, "modul")
    assert_course_editable(module.course)

    existing = db.execute(
        select(models.LearnBlock).where(
            models.LearnBlock.module_id == learn_data.module_id,
            models.LearnBlock.is_active.is_(True),
        )
    ).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Modul již má aktivní LearnBlock.")

    new_lb = models.LearnBlock(
        module_id=learn_data.module_id,
        title=learn_data.title,
        content=learn_data.content,
    )
    db.add(new_lb)
    db.commit()
    db.refresh(new_lb)

    return LearnBlock.model_validate(new_lb)


def update_learn_block(
    db: Session, learn_id: int, learn_data: LearnBlockUpdate, user: models.User
) -> LearnBlock:
    """Upraví title a content existujícího LearnBlock."""
    learn_block = get_or_404(db, models.LearnBlock, learn_id, detail="LearnBlock nenalezen nebo není aktivní")

    validate_owner_or_superadmin(learn_block, user, "learn block")
    assert_course_editable(learn_block.module.course)

    # Kontrola unikátnosti title (pokud se mění)
    if learn_data.title != learn_block.title:
        conflict = db.execute(
            select(models.LearnBlock).where(
                and_(
                    models.LearnBlock.module_id == learn_block.module_id,
                    models.LearnBlock.title == learn_data.title,
                    models.LearnBlock.is_active.is_(True),
                    models.LearnBlock.learn_id != learn_id,
                )
            )
        ).first()
        if conflict is not None:
            raise HTTPException(status_code=400, detail="LearnBlock s tímto názvem pro daný modul již existuje.")

    db.execute(
        update(models.LearnBlock)
        .where(models.LearnBlock.learn_id == learn_id)
        .values(**learn_data.model_dump())
    )
    db.commit()
    db.refresh(learn_block)

    return LearnBlock.model_validate(learn_block)


def delete_learn_block(db: Session, learn_id: int, user: models.User) -> None:
    """Soft-delete LearnBlock."""
    learn_block = get_or_404(db, models.LearnBlock, learn_id, detail="LearnBlock nenalezen nebo není aktivní")

    validate_owner_or_superadmin(learn_block, user, "learn block")
    assert_course_editable(learn_block.module.course)

    learn_block.soft_delete()
    db.commit()


# ---------- PracticeQuestion ----------


def create_practice_question(
    db: Session, question_data: PracticeQuestionCreate, user: models.User
) -> PracticeQuestion:
    """Vytvoří novou PracticeQuestion."""
    module = get_or_404(db, models.Module, question_data.module_id, detail="Modul nenalezen nebo není aktivní")

    validate_owner_or_superadmin(module, user, "modul")
    assert_course_editable(module.course)

    new_question = models.PracticeQuestion(
        module_id=question_data.module_id,
        question_type=question_data.question_type,
        question=question_data.question,
        correct_answer=question_data.correct_answer,
        example_answer=question_data.example_answer,
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    return PracticeQuestion.model_validate(new_question)


def update_practice_question(
    db: Session, question_id: int, question_data: PracticeQuestionUpdate, user: models.User
) -> PracticeQuestion:
    """Upraví PracticeQuestion."""
    question = get_or_404(db, models.PracticeQuestion, question_id, detail="PracticeQuestion nenalezena nebo není aktivní")

    validate_owner_or_superadmin(question, user, "practice question")
    assert_course_editable(question.module.course)

    db.execute(
        update(models.PracticeQuestion)
        .where(models.PracticeQuestion.question_id == question_id)
        .values(**question_data.model_dump())
    )
    db.commit()
    db.refresh(question)

    return PracticeQuestion.model_validate(question)


def delete_practice_question(db: Session, question_id: int, user: models.User) -> None:
    """Soft-delete PracticeQuestion — kaskádně smaže PracticeOption a QuestionKeyword."""
    question = get_or_404(db, models.PracticeQuestion, question_id, detail="PracticeQuestion nenalezena nebo není aktivní")

    validate_owner_or_superadmin(question, user, "practice question")
    assert_course_editable(question.module.course)

    question.soft_delete()  # _soft_delete_cascade = ["closed_options", "open_keywords"]
    db.commit()


# ---------- PracticeOption ----------


def create_practice_option(
    db: Session, option_data: PracticeOptionCreate, user: models.User
) -> PracticeOption:
    """Vytvoří novou PracticeOption."""
    question = get_or_404(db, models.PracticeQuestion, option_data.question_id, detail="Otázka nenalezena nebo není aktivní")

    validate_owner_or_superadmin(question, user, "otázka")
    assert_course_editable(question.module.course)

    new_option = models.PracticeOption(
        question_id=option_data.question_id,
        text=option_data.text,
    )
    db.add(new_option)
    db.commit()
    db.refresh(new_option)

    return PracticeOption.model_validate(new_option)


def update_practice_option(
    db: Session, option_id: int, option_data: PracticeOptionUpdate, user: models.User
) -> PracticeOption:
    """Upraví PracticeOption."""
    option = get_or_404(db, models.PracticeOption, option_id, detail="PracticeOption nenalezena nebo není aktivní")

    validate_owner_or_superadmin(option, user, "practice option")
    assert_course_editable(option.question.module.course)

    db.execute(
        update(models.PracticeOption)
        .where(models.PracticeOption.option_id == option_id)
        .values(**option_data.model_dump())
    )
    db.commit()
    db.refresh(option)

    return PracticeOption.model_validate(option)


def delete_practice_option(db: Session, option_id: int, user: models.User) -> None:
    """Soft-delete PracticeOption."""
    option = get_or_404(db, models.PracticeOption, option_id, detail="PracticeOption nenalezena nebo není aktivní")

    validate_owner_or_superadmin(option, user, "practice option")
    assert_course_editable(option.question.module.course)

    option.soft_delete()
    db.commit()


# ---------- QuestionKeyword ----------


def create_question_keyword(
    db: Session, keyword_data: QuestionKeywordCreate, user: models.User
) -> QuestionKeyword:
    """Přidá nový QuestionKeyword k otázce."""
    question = get_or_404(db, models.PracticeQuestion, keyword_data.question_id, detail="Otázka nenalezena nebo není aktivní")

    validate_owner_or_superadmin(question, user, "otázka")
    assert_course_editable(question.module.course)

    conflict = db.execute(
        select(models.QuestionKeyword).where(
            and_(
                models.QuestionKeyword.question_id == keyword_data.question_id,
                models.QuestionKeyword.keyword == keyword_data.keyword,
                models.QuestionKeyword.is_active.is_(True),
            )
        )
    ).first()
    if conflict is not None:
        raise HTTPException(status_code=400, detail="Keyword s tímto názvem pro danou otázku již existuje.")

    new_keyword = models.QuestionKeyword(
        question_id=keyword_data.question_id,
        keyword=keyword_data.keyword,
    )
    db.add(new_keyword)
    db.commit()
    db.refresh(new_keyword)

    return QuestionKeyword.model_validate(new_keyword)


def update_question_keyword(
    db: Session, keyword_id: int, keyword_data: QuestionKeywordUpdate, user: models.User
) -> QuestionKeyword:
    """Upraví QuestionKeyword."""
    keyword = get_or_404(db, models.QuestionKeyword, keyword_id, detail="QuestionKeyword nenalezen nebo není aktivní")

    validate_owner_or_superadmin(keyword, user, "question keyword")
    assert_course_editable(keyword.question.module.course)

    if keyword_data.keyword != keyword.keyword:
        conflict = db.execute(
            select(models.QuestionKeyword).where(
                and_(
                    models.QuestionKeyword.question_id == keyword.question_id,
                    models.QuestionKeyword.keyword == keyword_data.keyword,
                    models.QuestionKeyword.is_active.is_(True),
                    models.QuestionKeyword.keyword_id != keyword_id,
                )
            )
        ).first()
        if conflict is not None:
            raise HTTPException(status_code=400, detail="QuestionKeyword s tímto názvem pro danou question již existuje.")

    db.execute(
        update(models.QuestionKeyword)
        .where(models.QuestionKeyword.keyword_id == keyword_id)
        .values(**keyword_data.model_dump())
    )
    db.commit()
    db.refresh(keyword)

    return QuestionKeyword.model_validate(keyword)


def delete_question_keyword(db: Session, keyword_id: int, user: models.User) -> None:
    """Soft-delete QuestionKeyword."""
    keyword = get_or_404(db, models.QuestionKeyword, keyword_id, detail="QuestionKeyword nenalezen nebo není aktivní")

    validate_owner_or_superadmin(keyword, user, "question keyword")
    assert_course_editable(keyword.question.module.course)

    keyword.soft_delete()
    db.commit()
