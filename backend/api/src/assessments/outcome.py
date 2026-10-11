from pydantic import BaseModel


class AnswerOutcome(BaseModel):
    """Výsledek vyhodnocení odpovědi formátem.

    `result` = nový stav běhu do session.result (Pydantic model formátu,
    např. ClosedQuestionsResult). U `finished` jsou vyplněné `score` (0-100)
    a `is_passed`.
    """

    result: BaseModel
    is_correct: bool
    finished: bool
    score: float | None = None
    is_passed: bool | None = None
