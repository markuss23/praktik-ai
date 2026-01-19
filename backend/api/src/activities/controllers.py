from fastapi import HTTPException
from sqlalchemy import Select, select, update, and_
from sqlalchemy.orm import Session

from api import models, enums
from api.src.activities.schemas import (
    LearnBlock,
    LearnBlockUpdate,
    Practice,
    PracticeUpdate,
    PracticeQuestion,
    PracticeQuestionUpdate,
    PracticeOption,
    PracticeOptionUpdate,
    QuestionKeyword,
    QuestionKeywordUpdate,
)


def update_learn_block(
    db: Session, learn_id: int, learn_data: LearnBlockUpdate
) -> LearnBlock:
    """
    Upraví LearnBlock s validací:
    - lze editovat pouze pokud je aktivní
    - lze editovat pouze pokud je kurz ve stavu 'generated'
    - position musí být unikátní v rámci modulu
    """
    try:
        # načti learn block
        stm: Select[tuple[models.LearnBlock]] = select(models.LearnBlock).where(
            models.LearnBlock.learn_id == learn_id,
            models.LearnBlock.is_active.is_(True),
        )
        learn_block: models.LearnBlock | None = db.execute(stm).scalars().first()

        if learn_block is None:
            raise HTTPException(status_code=404, detail="LearnBlock nenalezen nebo není aktivní")

        # kontrola stavu kurzu
        module = learn_block.module
        course = module.course

        if course.status != enums.Status.generated:
            raise HTTPException(
                status_code=400,
                detail="LearnBlock lze editovat pouze pokud je kurz ve stavu 'generated'.",
            )

        # kontrola unikátnosti position (pokud se mění)
        if learn_data.position != learn_block.position:
            exists_stm: Select[tuple[models.LearnBlock]] = select(models.LearnBlock).where(
                and_(
                    models.LearnBlock.module_id == learn_block.module_id,
                    models.LearnBlock.position == learn_data.position,
                    models.LearnBlock.is_active.is_(True),
                    models.LearnBlock.learn_id != learn_id,
                )
            )
            if db.execute(exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="LearnBlock s touto pozicí pro daný modul již existuje.",
                )

        # update
        stm = (
            update(models.LearnBlock)
            .where(models.LearnBlock.learn_id == learn_id)
            .values(**learn_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(learn_block)

        return LearnBlock.model_validate(learn_block)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_learn_block error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_practice(
    db: Session, practice_id: int, practice_data: PracticeUpdate
) -> Practice:
    """
    Upraví Practice s validací:
    - lze editovat pouze pokud je aktivní
    - lze editovat pouze pokud je kurz ve stavu 'generated'
    - position musí být unikátní v rámci modulu
    """
    try:
        # načti practice
        stm: Select[tuple[models.Practice]] = select(models.Practice).where(
            models.Practice.practice_id == practice_id,
            models.Practice.is_active.is_(True),
        )
        practice: models.Practice | None = db.execute(stm).scalars().first()

        if practice is None:
            raise HTTPException(status_code=404, detail="Practice nenalezena nebo není aktivní")

        # kontrola stavu kurzu
        module = practice.module
        course = module.course

        if course.status != enums.Status.generated:
            raise HTTPException(
                status_code=400,
                detail="Practice lze editovat pouze pokud je kurz ve stavu 'generated'.",
            )

        # kontrola unikátnosti position (pokud se mění)
        if practice_data.position != practice.position:
            exists_stm: Select[tuple[models.Practice]] = select(models.Practice).where(
                and_(
                    models.Practice.module_id == practice.module_id,
                    models.Practice.position == practice_data.position,
                    models.Practice.is_active.is_(True),
                    models.Practice.practice_id != practice_id,
                )
            )
            if db.execute(exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Practice s touto pozicí pro daný modul již existuje.",
                )

        # update
        stm = (
            update(models.Practice)
            .where(models.Practice.practice_id == practice_id)
            .values(**practice_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(practice)

        return Practice.model_validate(practice)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_practice error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_practice_question(
    db: Session, question_id: int, question_data: PracticeQuestionUpdate
) -> PracticeQuestion:
    """
    Upraví PracticeQuestion s validací:
    - lze editovat pouze pokud je aktivní
    - lze editovat pouze pokud je kurz ve stavu 'generated'
    - position musí být unikátní v rámci practice
    """
    try:
        # načti question
        stm: Select[tuple[models.PracticeQuestion]] = select(models.PracticeQuestion).where(
            models.PracticeQuestion.question_id == question_id,
            models.PracticeQuestion.is_active.is_(True),
        )
        question: models.PracticeQuestion | None = db.execute(stm).scalars().first()

        if question is None:
            raise HTTPException(status_code=404, detail="PracticeQuestion nenalezena nebo není aktivní")

        # kontrola stavu kurzu
        practice = question.practice
        module = practice.module
        course = module.course

        if course.status != enums.Status.generated:
            raise HTTPException(
                status_code=400,
                detail="PracticeQuestion lze editovat pouze pokud je kurz ve stavu 'generated'.",
            )

        # kontrola unikátnosti position (pokud se mění)
        if question_data.position != question.position:
            exists_stm: Select[tuple[models.PracticeQuestion]] = select(models.PracticeQuestion).where(
                and_(
                    models.PracticeQuestion.practice_id == question.practice_id,
                    models.PracticeQuestion.position == question_data.position,
                    models.PracticeQuestion.is_active.is_(True),
                    models.PracticeQuestion.question_id != question_id,
                )
            )
            if db.execute(exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="PracticeQuestion s touto pozicí pro danou practice již existuje.",
                )

        # update
        stm = (
            update(models.PracticeQuestion)
            .where(models.PracticeQuestion.question_id == question_id)
            .values(**question_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(question)

        return PracticeQuestion.model_validate(question)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_practice_question error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_practice_option(
    db: Session, option_id: int, option_data: PracticeOptionUpdate
) -> PracticeOption:
    """
    Upraví PracticeOption s validací:
    - lze editovat pouze pokud je aktivní
    - lze editovat pouze pokud je kurz ve stavu 'generated'
    - position musí být unikátní v rámci question
    """
    try:
        # načti option
        stm: Select[tuple[models.PracticeOption]] = select(models.PracticeOption).where(
            models.PracticeOption.option_id == option_id,
            models.PracticeOption.is_active.is_(True),
        )
        option: models.PracticeOption | None = db.execute(stm).scalars().first()

        if option is None:
            raise HTTPException(status_code=404, detail="PracticeOption nenalezena nebo není aktivní")

        # kontrola stavu kurzu
        question = option.question
        practice = question.practice
        module = practice.module
        course = module.course

        if course.status != enums.Status.generated:
            raise HTTPException(
                status_code=400,
                detail="PracticeOption lze editovat pouze pokud je kurz ve stavu 'generated'.",
            )

        # kontrola unikátnosti position (pokud se mění)
        if option_data.position != option.position:
            exists_stm: Select[tuple[models.PracticeOption]] = select(models.PracticeOption).where(
                and_(
                    models.PracticeOption.question_id == option.question_id,
                    models.PracticeOption.position == option_data.position,
                    models.PracticeOption.is_active.is_(True),
                    models.PracticeOption.option_id != option_id,
                )
            )
            if db.execute(exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="PracticeOption s touto pozicí pro danou question již existuje.",
                )

        # update
        stm = (
            update(models.PracticeOption)
            .where(models.PracticeOption.option_id == option_id)
            .values(**option_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(option)

        return PracticeOption.model_validate(option)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_practice_option error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e


def update_question_keyword(
    db: Session, keyword_id: int, keyword_data: QuestionKeywordUpdate
) -> QuestionKeyword:
    """
    Upraví QuestionKeyword s validací:
    - lze editovat pouze pokud je aktivní
    - lze editovat pouze pokud je kurz ve stavu 'generated'
    - keyword musí být unikátní v rámci question
    """
    try:
        # načti keyword
        stm: Select[tuple[models.QuestionKeyword]] = select(models.QuestionKeyword).where(
            models.QuestionKeyword.keyword_id == keyword_id,
            models.QuestionKeyword.is_active.is_(True),
        )
        keyword: models.QuestionKeyword | None = db.execute(stm).scalars().first()

        if keyword is None:
            raise HTTPException(status_code=404, detail="QuestionKeyword nenalezen nebo není aktivní")

        # kontrola stavu kurzu
        question = keyword.question
        practice = question.practice
        module = practice.module
        course = module.course

        if course.status != enums.Status.generated:
            raise HTTPException(
                status_code=400,
                detail="QuestionKeyword lze editovat pouze pokud je kurz ve stavu 'generated'.",
            )

        # kontrola unikátnosti keyword (pokud se mění)
        if keyword_data.keyword != keyword.keyword:
            exists_stm: Select[tuple[models.QuestionKeyword]] = select(models.QuestionKeyword).where(
                and_(
                    models.QuestionKeyword.question_id == keyword.question_id,
                    models.QuestionKeyword.keyword == keyword_data.keyword,
                    models.QuestionKeyword.is_active.is_(True),
                    models.QuestionKeyword.keyword_id != keyword_id,
                )
            )
            if db.execute(exists_stm).first() is not None:
                raise HTTPException(
                    status_code=400,
                    detail="QuestionKeyword s tímto názvem pro danou question již existuje.",
                )

        # update
        stm = (
            update(models.QuestionKeyword)
            .where(models.QuestionKeyword.keyword_id == keyword_id)
            .values(**keyword_data.model_dump())
        )
        db.execute(stm)
        db.commit()
        db.refresh(keyword)

        return QuestionKeyword.model_validate(keyword)

    except HTTPException:
        raise
    except Exception as e:
        print(f"update_question_keyword error: {e}")
        raise HTTPException(status_code=500, detail="Nečekávaná chyba serveru") from e
