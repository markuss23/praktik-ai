from pydantic import BaseModel


class AnswerOutcome(BaseModel):
    """Výsledek vyhodnocení odpovědi formátem.

    `state` = nový stav běhu do session.state (Pydantic model formátu,
    např. ClosedQuestionsState). U `finished` jsou vyplněné `score` (0-100)
    a `is_passed`.
    """

    state: BaseModel
    is_correct: bool
    finished: bool
    score: float | None = None
    is_passed: bool | None = None
    # Slovní zpětná vazba pro studenta (jen formáty s AI evaluátorem)
    feedback: str | None = None
