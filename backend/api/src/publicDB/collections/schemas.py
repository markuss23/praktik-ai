from datetime import datetime

from api.enums import PubResourceStatus
from api.src.common.schemas import ORMModel


class PubCollectionBase(ORMModel):
    title: str
    description: str | None = None
    is_public: bool = False


class PubCollectionCreate(PubCollectionBase):
    pass


class PubCollectionUpdate(ORMModel):
    title: str | None = None
    description: str | None = None


class PubCollectionPublicStateUpdate(ORMModel):
    is_public: bool


class PubResourceBasic(ORMModel):
    resource_id: int
    title: str
    description: str | None = None
    status: PubResourceStatus
    is_public: bool
    author_id: int


class PubCollectionResourceItem(ORMModel):
    added_at: datetime
    resource: PubResourceBasic


class PubCollectionCreated(PubCollectionBase):
    collection_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class PubCollectionDetail(PubCollectionCreated):
    items: list[PubCollectionResourceItem] = []
