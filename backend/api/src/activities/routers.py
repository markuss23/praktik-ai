from fastapi import APIRouter
from api.dependencies import CurrentUser
from api.src.activities.controllers import (
    create_learn_block,
    update_learn_block,
    create_practice_question,
    update_practice_question,
    create_practice_option,
    update_practice_option,
    update_question_keyword,
)
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
    QuestionKeywordUpdate,
)

from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.post("/learn-blocks", operation_id="create_learn_block")
async def endp_create_learn_block(
    learn_block: LearnBlockCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> LearnBlock:
    return create_learn_block(db, learn_block, user)


@router.put("/learn-blocks/{learn_id}", operation_id="update_learn_block")
async def endp_update_learn_block(
    learn_id: int, learn_block: LearnBlockUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> LearnBlock:
    return update_learn_block(db, learn_id, learn_block, user)


@router.post("/practice-questions", operation_id="create_practice_question")
async def endp_create_practice_question(
    question: PracticeQuestionCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PracticeQuestion:
    return create_practice_question(db, question, user)


@router.put("/practice-questions/{question_id}", operation_id="update_practice_question")
async def endp_update_practice_question(
    question_id: int, question: PracticeQuestionUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PracticeQuestion:
    return update_practice_question(db, question_id, question, user)


@router.post("/practice-options", operation_id="create_practice_option")
async def endp_create_practice_option(
    option: PracticeOptionCreate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PracticeOption:
    return create_practice_option(db, option, user)


@router.put("/practice-options/{option_id}", operation_id="update_practice_option")
async def endp_update_practice_option(
    option_id: int, option: PracticeOptionUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> PracticeOption:
    return update_practice_option(db, option_id, option, user)


@router.put("/question-keywords/{keyword_id}", operation_id="update_question_keyword")
async def endp_update_question_keyword(
    keyword_id: int, keyword: QuestionKeywordUpdate, db: SessionSqlSessionDependency, user: CurrentUser
) -> QuestionKeyword:
    return update_question_keyword(db, keyword_id, keyword, user)
