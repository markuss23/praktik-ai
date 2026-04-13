"""
Controllery pro procvičovací otázky (UserPracticeQuestion / UserPracticeAttempt).
"""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from api.enums import QuestionType
from api.src.common.utils import get_or_404, check_enrollment
from api.src.agents.schemas import (
    EvaluatePracticeAnswerResponse,
    GeneratePracticeQuestionResponse,
    PracticeAttempt,
    PracticeQuestionOption,
    PracticeQuestionWithAttempts,
)
from agents.practice_question_generator.service import PracticeQuestionGenerator
from agents.practice_answer_evaluator.service import PracticeAnswerEvaluator


async def generate_practice_question(
    db: Session,
    module_id: int,
    question_type: QuestionType,
    user: models.User,
) -> GeneratePracticeQuestionResponse:
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")

    course = module.course
    if not course.is_active or course.status not in ("approved", "archived"):
        raise HTTPException(
            status_code=400,
            detail="Modul není v aktivním a schváleném kurzu",
        )

    check_enrollment(db, user, course)

    try:
        result = await PracticeQuestionGenerator(
            db=db,
            module_id=module_id,
            user_id=user.user_id,
            question_type=question_type,
        ).generate()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    options = None
    if result.options is not None:
        options = [PracticeQuestionOption(text=o["text"]) for o in result.options]

    return GeneratePracticeQuestionResponse(
        user_question_id=result.user_question_id,
        question_type=question_type,
        generated_question=result.generated_question,
        options=options,
    )


async def evaluate_practice_answer(
    db: Session,
    user_question_id: int,
    user_input: str,
    user: models.User,
) -> EvaluatePracticeAnswerResponse:
    question: models.UserPracticeQuestion | None = (
        db.execute(
            select(models.UserPracticeQuestion).where(
                models.UserPracticeQuestion.user_question_id == user_question_id,
                models.UserPracticeQuestion.is_active.is_(True),
            )
        )
        .scalars()
        .first()
    )

    if question is None:
        raise HTTPException(status_code=404, detail="Procvičovací otázka nenalezena")

    if question.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Přístup odepřen")

    # Pokud už uživatel na tuto otázku odpověděl správně, další pokusy nepovolujeme.
    already_correct_attempt = (
        db.execute(
            select(models.UserPracticeAttempt.attempt_id).where(
                models.UserPracticeAttempt.user_question_id == user_question_id,
                models.UserPracticeAttempt.is_correct.is_(True),
                models.UserPracticeAttempt.is_active.is_(True),
            )
        )
        .scalars()
        .first()
    )
    if already_correct_attempt is not None:
        raise HTTPException(
            status_code=409,
            detail="Na tuto procvičovací otázku už byla zaznamenána správná odpověď",
        )

    if question.question_type == QuestionType.closed:
        return _evaluate_closed(db, question, user_input)

    # open — AI evaluace
    try:
        result = await PracticeAnswerEvaluator(
            db=db,
            user_question_id=user_question_id,
            user_input=user_input,
        ).evaluate()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return EvaluatePracticeAnswerResponse(
        attempt_id=result.attempt_id,
        is_correct=result.is_correct,
        ai_response=result.ai_response,
    )


def _evaluate_closed(
    db: Session,
    question: models.UserPracticeQuestion,
    user_input: str,
) -> EvaluatePracticeAnswerResponse:
    """Vyhodnotí uzavřenou otázku přímým porovnáním s označenou správnou možností."""
    options: list[dict] | None = question.options
    if not options:
        raise HTTPException(
            status_code=500,
            detail="Uzavřená otázka nemá uložené možnosti",
        )

    is_correct = any(
        o.get("is_correct") and o.get("text", "").strip() == user_input.strip()
        for o in options
    )

    attempt = models.UserPracticeAttempt(
        user_question_id=question.user_question_id,
        user_input=user_input,
        ai_response=None,
        is_correct=is_correct,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return EvaluatePracticeAnswerResponse(
        attempt_id=attempt.attempt_id,
        is_correct=is_correct,
        ai_response=None,
    )


def list_practice_questions(
    db: Session,
    module_id: int,
    user: models.User,
) -> list[PracticeQuestionWithAttempts]:
    module = get_or_404(db, models.Module, module_id, detail="Modul nenalezen")
    check_enrollment(db, user, module.course)

    questions = (
        db.execute(
            select(models.UserPracticeQuestion)
            .options(joinedload(models.UserPracticeQuestion.attempts))
            .where(
                models.UserPracticeQuestion.user_id == user.user_id,
                models.UserPracticeQuestion.module_id == module_id,
                models.UserPracticeQuestion.is_active.is_(True),
            )
            .order_by(models.UserPracticeQuestion.created_at)
        )
        .unique()
        .scalars()
        .all()
    )

    result = []
    for q in questions:
        options = None
        if q.options is not None:
            options = [PracticeQuestionOption(text=o["text"]) for o in q.options]

        attempts = [
            PracticeAttempt(
                attempt_id=a.attempt_id,
                user_input=a.user_input,
                ai_response=a.ai_response,
                is_correct=a.is_correct,
                created_at=a.created_at,
            )
            for a in q.attempts
        ]

        result.append(
            PracticeQuestionWithAttempts(
                user_question_id=q.user_question_id,
                question_type=q.question_type,
                generated_question=q.generated_question,
                options=options,
                attempts=attempts,
                created_at=q.created_at,
            )
        )

    return result
