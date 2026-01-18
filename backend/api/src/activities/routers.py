from fastapi import APIRouter
from api.src.activities.controllers import (
    update_learn_block,
    update_practice,
    update_practice_question,
    update_practice_option,
    update_question_keyword,
)
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

from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.put("/learn-blocks/{learn_id}", operation_id="update_learn_block")
async def endp_update_learn_block(
    learn_id: int, learn_block: LearnBlockUpdate, db: SessionSqlSessionDependency
) -> LearnBlock:
    return update_learn_block(db, learn_id, learn_block)


@router.put("/practices/{practice_id}", operation_id="update_practice")
async def endp_update_practice(
    practice_id: int, practice: PracticeUpdate, db: SessionSqlSessionDependency
) -> Practice:
    return update_practice(db, practice_id, practice)


@router.put("/practice-questions/{question_id}", operation_id="update_practice_question")
async def endp_update_practice_question(
    question_id: int, question: PracticeQuestionUpdate, db: SessionSqlSessionDependency
) -> PracticeQuestion:
    return update_practice_question(db, question_id, question)


@router.put("/practice-options/{option_id}", operation_id="update_practice_option")
async def endp_update_practice_option(
    option_id: int, option: PracticeOptionUpdate, db: SessionSqlSessionDependency
) -> PracticeOption:
    return update_practice_option(db, option_id, option)


@router.put("/question-keywords/{keyword_id}", operation_id="update_question_keyword")
async def endp_update_question_keyword(
    keyword_id: int, keyword: QuestionKeywordUpdate, db: SessionSqlSessionDependency
) -> QuestionKeyword:
    return update_question_keyword(db, keyword_id, keyword)
