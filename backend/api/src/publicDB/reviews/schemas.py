from datetime import datetime
from typing import Any

from pydantic import model_validator

from api.src.common.schemas import ORMModel
from api.enums import ReviewVerdict


class PubResourceReviewBase(ORMModel):
    verdict: ReviewVerdict
    notes: str | None = None


class PubResourceReviewCreate(PubResourceReviewBase):
    pass


class PubResourceReviewUpdate(PubResourceReviewBase):
    pass


class PubResourceReview(PubResourceReviewBase):
    review_id: int
    resource_id: int
    reviewer_id: int
    reviewer_display_name: str | None = None
    reviewed_at: datetime
    is_active: bool

    @model_validator(mode="before")
    @classmethod
    def fill_reviewer_display_name(cls, value: Any) -> Any:
        """Vyplní reviewer_display_name z navázaného ORM vztahu reviewer."""
        if hasattr(value, "reviewer") and value.reviewer is not None:
            value.__dict__["reviewer_display_name"] = value.reviewer.display_name
        return value
