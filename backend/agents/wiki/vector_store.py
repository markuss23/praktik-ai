"""Vlastní PGVector store pro wiki agenta (oddělená kolekce od kurzů)."""

from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

from api.config import settings

_embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
_wiki_vector_store: PGVector | None = None

WIKI_COLLECTION_NAME = "wiki_embeddings"


def get_wiki_vector_store() -> PGVector:
    """
    Vrátí lazily-inicializovanou instanci PGVector pro wiki obsah.

    Používá vlastní kolekci `wiki_embeddings`, aby se wiki stránky
    nemíchaly s embeddingy kurzů (`course_embeddings`).
    """
    global _wiki_vector_store
    if _wiki_vector_store is None:
        _wiki_vector_store = PGVector(
            embeddings=_embeddings,
            collection_name=WIKI_COLLECTION_NAME,
            connection=settings.postgres.get_connection_string(),
            use_jsonb=True,
        )
    return _wiki_vector_store
