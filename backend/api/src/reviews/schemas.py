from api.src.common.schemas import ORMModel
from api.enums import ReviewVerdict


class PubResourceReviewCreate(ORMModel):
    verdict: ReviewVerdict
    notes: str | None = None
