from datetime import datetime
from typing import Any

from pydantic import model_validator

from api.src.common.schemas import ORMModel


class PubResourceRatingBase(ORMModel):
    score: int
    comment: str | None = None


class PubResourceRatingCreate(PubResourceRatingBase):
    pass


class PubResourceRatingUpdate(PubResourceRatingBase):
    pass


class PubResourceRatingCreated(PubResourceRatingBase):
    rating_id: int
    resource_id: int
    user_id: int
    user_display_name: str | None = None
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def fill_user_display_name(cls, value: Any) -> Any:
        """Vyplní user_display_name z navázaného ORM vztahu user."""
        if hasattr(value, "user") and value.user is not None:
            value.__dict__["user_display_name"] = value.user.display_name
        return value


class PubResourceRating(PubResourceRatingBase):
    rating_id: int
    resource_id: int
    user_id: int
    user_display_name: str | None = None
    created_at: datetime
    updated_at: datetime
    is_active: bool

    @model_validator(mode="before")
    @classmethod
    def fill_user_display_name(cls, value: Any) -> Any:
        """Vyplní user_display_name z navázaného ORM vztahu user."""
        if hasattr(value, "user") and value.user is not None:
            value.__dict__["user_display_name"] = value.user.display_name
        return value
