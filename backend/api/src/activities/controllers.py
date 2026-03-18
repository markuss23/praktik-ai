from fastapi import HTTPException
from sqlalchemy import Select, select, update, and_
from sqlalchemy.orm import Session

from api import models, enums
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


# ---------- Helpers ----------


def _assert_course_editable(course: models.Course) -> None:
    if course.status not in (enums.Status.draft, enums.Status.generated, enums.Status.edited):
        raise HTTPException(
            status_code=400,
            detail="Editace je povolena pouze pokud je kurz ve stavu 'koncept', 'vygenerovaný' nebo 'editovaný'.",
        )


# ---------- LearnBlock ----------


def create_learn_block(
    db: Session, learn_data: LearnBlockCreate, user: models.User
) -> LearnBlock:
    """Vytvoří LearnBlock — modul smí mít nejvýše jeden aktivní."""
    try:
        module: models.Module | None = db.execute(
            select(models.Module).where(
                models.Module.module_id == learn_data.module_id,
                models.Module.is_active.is_(True),
            )
        ).scalars().first()

        if module is None:
            raise HTTPException(status_code=404, detail="Modul nenalezen nebo není aktivní")

        validate_owner_or_superadmin(module, user, "modul")
        _assert_course_editable(module.course)

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
            position=learn_data.position,
            content=learn_data.content,
        )
        db.add(new_lb)
        db.commit()
        db.refresh(new_lb)

        return LearnBlock.model_validate(new_lb)

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_learn_block error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_learn_block(
    db: Session, learn_id: int, learn_data: LearnBlockUpdate, user: models.User
) -> LearnBlock:
    """Upraví title a content existujícího LearnBlock."""
    try:
        learn_block: models.LearnBlock | None = db.execute(
            select(models.LearnBlock).where(
                models.LearnBlock.learn_id == learn_id,
                models.LearnBlock.is_active.is_(True),
            )
        ).scalars().first()

        if learn_block is None:
            raise HTTPException(status_code=404, detail="LearnBlock nenalezen nebo není aktivní")

        validate_owner_or_superadmin(learn_block, user, "learn block")
        _assert_course_editable(learn_block.module.course)

        # Kontrola unikátnosti position (pokud se mění)
        if learn_data.position != learn_block.position:
            conflict = db.execute(
                select(models.LearnBlock).where(
                    and_(
                        models.LearnBlock.module_id == learn_block.module_id,
                        models.LearnBlock.position == learn_data.position,
                        models.LearnBlock.is_active.is_(True),
                        models.LearnBlock.learn_id != learn_id,
                    )
                )
            ).first()
            if conflict is not None:
                raise HTTPException(status_code=400, detail="LearnBlock s touto pozicí pro daný modul již existuje.")

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

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_learn_block error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_learn_block(db: Session, learn_id: int, user: models.User) -> None:
    """Soft-delete LearnBlock."""
    try:
        learn_block: models.LearnBlock | None = db.execute(
            select(models.LearnBlock).where(
                models.LearnBlock.learn_id == learn_id,
                models.LearnBlock.is_active.is_(True),
            )
        ).scalars().first()

        if learn_block is None:
            raise HTTPException(status_code=404, detail="LearnBlock nenalezen nebo není aktivní")

        validate_owner_or_superadmin(learn_block, user, "learn block")
        _assert_course_editable(learn_block.module.course)

        learn_block.soft_delete()
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_learn_block error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


# ---------- PracticeQuestion ----------


def create_practice_question(
    db: Session, question_data: PracticeQuestionCreate, user: models.User
) -> PracticeQuestion:
    """Vytvoří novou PracticeQuestion."""
    try:
        module: models.Module | None = db.execute(
            select(models.Module).where(
                models.Module.module_id == question_data.module_id,
                models.Module.is_active.is_(True),
            )
        ).scalars().first()

        if module is None:
            raise HTTPException(status_code=404, detail="Modul nenalezen nebo není aktivní")

        validate_owner_or_superadmin(module, user, "modul")
        _assert_course_editable(module.course)

        # Pokud je pozice obsazena, přiřaď následující
        conflict = db.execute(
            select(models.PracticeQuestion).where(
                and_(
                    models.PracticeQuestion.module_id == question_data.module_id,
                    models.PracticeQuestion.position == question_data.position,
                    models.PracticeQuestion.is_active.is_(True),
                )
            )
        ).first()
        if conflict is not None:
            max_pos = db.execute(
                select(models.PracticeQuestion.position).where(
                    models.PracticeQuestion.module_id == question_data.module_id,
                    models.PracticeQuestion.is_active.is_(True),
                ).order_by(models.PracticeQuestion.position.desc()).limit(1)
            ).scalar() or 0
            question_data = PracticeQuestionCreate(
                **{**question_data.model_dump(), "position": max_pos + 1}
            )

        new_question = models.PracticeQuestion(
            module_id=question_data.module_id,
            position=question_data.position,
            question_type=question_data.question_type,
            question=question_data.question,
            correct_answer=question_data.correct_answer,
            example_answer=question_data.example_answer,
        )
        db.add(new_question)
        db.commit()
        db.refresh(new_question)

        return PracticeQuestion.model_validate(new_question)

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_practice_question error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_practice_question(
    db: Session, question_id: int, question_data: PracticeQuestionUpdate, user: models.User
) -> PracticeQuestion:
    """Upraví PracticeQuestion."""
    try:
        question: models.PracticeQuestion | None = db.execute(
            select(models.PracticeQuestion).where(
                models.PracticeQuestion.question_id == question_id,
                models.PracticeQuestion.is_active.is_(True),
            )
        ).scalars().first()

        if question is None:
            raise HTTPException(status_code=404, detail="PracticeQuestion nenalezena nebo není aktivní")

        validate_owner_or_superadmin(question, user, "practice question")
        _assert_course_editable(question.module.course)

        if question_data.position != question.position:
            conflict = db.execute(
                select(models.PracticeQuestion).where(
                    and_(
                        models.PracticeQuestion.module_id == question.module_id,
                        models.PracticeQuestion.position == question_data.position,
                        models.PracticeQuestion.is_active.is_(True),
                        models.PracticeQuestion.question_id != question_id,
                    )
                )
            ).first()
            if conflict is not None:
                raise HTTPException(status_code=400, detail="PracticeQuestion s touto pozicí pro daný modul již existuje.")

        db.execute(
            update(models.PracticeQuestion)
            .where(models.PracticeQuestion.question_id == question_id)
            .values(**question_data.model_dump())
        )
        db.commit()
        db.refresh(question)

        return PracticeQuestion.model_validate(question)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_practice_question error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_practice_question(db: Session, question_id: int, user: models.User) -> None:
    """Soft-delete PracticeQuestion — kaskádně smaže PracticeOption a QuestionKeyword."""
    try:
        question: models.PracticeQuestion | None = db.execute(
            select(models.PracticeQuestion).where(
                models.PracticeQuestion.question_id == question_id,
                models.PracticeQuestion.is_active.is_(True),
            )
        ).scalars().first()

        if question is None:
            raise HTTPException(status_code=404, detail="PracticeQuestion nenalezena nebo není aktivní")

        validate_owner_or_superadmin(question, user, "practice question")
        _assert_course_editable(question.module.course)

        question.soft_delete()  # _soft_delete_cascade = ["closed_options", "open_keywords"]
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_practice_question error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


# ---------- PracticeOption ----------


def create_practice_option(
    db: Session, option_data: PracticeOptionCreate, user: models.User
) -> PracticeOption:
    """Vytvoří novou PracticeOption."""
    try:
        question: models.PracticeQuestion | None = db.execute(
            select(models.PracticeQuestion).where(
                models.PracticeQuestion.question_id == option_data.question_id,
                models.PracticeQuestion.is_active.is_(True),
            )
        ).scalars().first()

        if question is None:
            raise HTTPException(status_code=404, detail="Otázka nenalezena nebo není aktivní")

        validate_owner_or_superadmin(question, user, "otázka")
        _assert_course_editable(question.module.course)

        conflict = db.execute(
            select(models.PracticeOption).where(
                and_(
                    models.PracticeOption.question_id == option_data.question_id,
                    models.PracticeOption.position == option_data.position,
                    models.PracticeOption.is_active.is_(True),
                )
            )
        ).first()
        if conflict is not None:
            max_pos = db.execute(
                select(models.PracticeOption.position).where(
                    models.PracticeOption.question_id == option_data.question_id,
                    models.PracticeOption.is_active.is_(True),
                ).order_by(models.PracticeOption.position.desc()).limit(1)
            ).scalar() or 0
            option_data = PracticeOptionCreate(
                **{**option_data.model_dump(), "position": max_pos + 1}
            )

        new_option = models.PracticeOption(
            question_id=option_data.question_id,
            position=option_data.position,
            text=option_data.text,
        )
        db.add(new_option)
        db.commit()
        db.refresh(new_option)

        return PracticeOption.model_validate(new_option)

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_practice_option error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_practice_option(
    db: Session, option_id: int, option_data: PracticeOptionUpdate, user: models.User
) -> PracticeOption:
    """Upraví PracticeOption."""
    try:
        option: models.PracticeOption | None = db.execute(
            select(models.PracticeOption).where(
                models.PracticeOption.option_id == option_id,
                models.PracticeOption.is_active.is_(True),
            )
        ).scalars().first()

        if option is None:
            raise HTTPException(status_code=404, detail="PracticeOption nenalezena nebo není aktivní")

        validate_owner_or_superadmin(option, user, "practice option")
        _assert_course_editable(option.question.module.course)

        if option_data.position != option.position:
            conflict = db.execute(
                select(models.PracticeOption).where(
                    and_(
                        models.PracticeOption.question_id == option.question_id,
                        models.PracticeOption.position == option_data.position,
                        models.PracticeOption.is_active.is_(True),
                        models.PracticeOption.option_id != option_id,
                    )
                )
            ).first()
            if conflict is not None:
                raise HTTPException(status_code=400, detail="PracticeOption s touto pozicí pro danou question již existuje.")

        db.execute(
            update(models.PracticeOption)
            .where(models.PracticeOption.option_id == option_id)
            .values(**option_data.model_dump())
        )
        db.commit()
        db.refresh(option)

        return PracticeOption.model_validate(option)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_practice_option error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_practice_option(db: Session, option_id: int, user: models.User) -> None:
    """Soft-delete PracticeOption."""
    try:
        option: models.PracticeOption | None = db.execute(
            select(models.PracticeOption).where(
                models.PracticeOption.option_id == option_id,
                models.PracticeOption.is_active.is_(True),
            )
        ).scalars().first()

        if option is None:
            raise HTTPException(status_code=404, detail="PracticeOption nenalezena nebo není aktivní")

        validate_owner_or_superadmin(option, user, "practice option")
        _assert_course_editable(option.question.module.course)

        option.soft_delete()
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_practice_option error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


# ---------- QuestionKeyword ----------


def create_question_keyword(
    db: Session, keyword_data: QuestionKeywordCreate, user: models.User
) -> QuestionKeyword:
    """Přidá nový QuestionKeyword k otázce."""
    try:
        question: models.PracticeQuestion | None = db.execute(
            select(models.PracticeQuestion).where(
                models.PracticeQuestion.question_id == keyword_data.question_id,
                models.PracticeQuestion.is_active.is_(True),
            )
        ).scalars().first()

        if question is None:
            raise HTTPException(status_code=404, detail="Otázka nenalezena nebo není aktivní")

        validate_owner_or_superadmin(question, user, "otázka")
        _assert_course_editable(question.module.course)

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

    except HTTPException:
        raise
    except Exception as e:
        print(f"create_question_keyword error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_question_keyword(
    db: Session, keyword_id: int, keyword_data: QuestionKeywordUpdate, user: models.User
) -> QuestionKeyword:
    """Upraví QuestionKeyword."""
    try:
        keyword: models.QuestionKeyword | None = db.execute(
            select(models.QuestionKeyword).where(
                models.QuestionKeyword.keyword_id == keyword_id,
                models.QuestionKeyword.is_active.is_(True),
            )
        ).scalars().first()

        if keyword is None:
            raise HTTPException(status_code=404, detail="QuestionKeyword nenalezen nebo není aktivní")

        validate_owner_or_superadmin(keyword, user, "question keyword")
        _assert_course_editable(keyword.question.module.course)

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

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_question_keyword error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def delete_question_keyword(db: Session, keyword_id: int, user: models.User) -> None:
    """Soft-delete QuestionKeyword."""
    try:
        keyword: models.QuestionKeyword | None = db.execute(
            select(models.QuestionKeyword).where(
                models.QuestionKeyword.keyword_id == keyword_id,
                models.QuestionKeyword.is_active.is_(True),
            )
        ).scalars().first()

        if keyword is None:
            raise HTTPException(status_code=404, detail="QuestionKeyword nenalezen nebo není aktivní")

        validate_owner_or_superadmin(keyword, user, "question keyword")
        _assert_course_editable(keyword.question.module.course)

        keyword.soft_delete()
        db.commit()

    except HTTPException:
        raise
    except Exception as e:
        print(f"delete_question_keyword error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
