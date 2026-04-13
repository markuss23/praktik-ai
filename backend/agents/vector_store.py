"""
Shared PGVector store factory – singleton to avoid duplicate
SQLAlchemy MetaData registration of langchain_pg_collection.
"""

from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

from api.config import settings

_embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
_vector_store: PGVector | None = None

COLLECTION_NAME = "course_embeddings"


def get_vector_store() -> PGVector:
    """Return a lazily-initialised, reusable PGVector instance."""
    global _vector_store
    if _vector_store is None:
        _vector_store = PGVector(
            embeddings=_embeddings,
            collection_name=COLLECTION_NAME,
            connection=settings.postgres.get_connection_string(),
            use_jsonb=True,
        )
    return _vector_store
