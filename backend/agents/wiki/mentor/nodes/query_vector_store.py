"""Node pro dotazování wiki vector store."""

from langchain_core.documents.base import Document

from agents.wiki.mentor.state import WikiMentorState, ChunkData
from agents.wiki.vector_store import get_wiki_vector_store


def query_vector_store_node(state: WikiMentorState) -> WikiMentorState:
    """
    Najde nejrelevantnější wiki chunky k otázce uživatele.

    """
    print("Dotazuji wiki vector store...")

    vector_store = get_wiki_vector_store()

    results: list[Document] = vector_store.similarity_search(
        query=state["message"],
        k=10,
    )

    print(f"Nalezeno {len(results)} relevantnich chunku")

    context_chunks: list[ChunkData] = [
        ChunkData(
            content=result.page_content,
            metadata=result.metadata,
        )
        for result in results
    ]

    return {
        **state,
        "context_chunks": context_chunks,
    }
