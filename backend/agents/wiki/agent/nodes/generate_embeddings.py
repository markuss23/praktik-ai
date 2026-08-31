"""Node pro generování embeddingů z wiki stránek."""

from langchain_core.documents.base import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from agents.wiki.agent.state import WikiAgentState, WikiPageData
from agents.wiki.vector_store import get_wiki_vector_store


def generate_embeddings_node(state: WikiAgentState) -> WikiAgentState:
    """
    Rozseká obsah wiki stránek na chunky a uloží jejich embeddingy.

    """
    pages: list[WikiPageData] = state.get("pages", [])

    if not pages:
        print("Žádné wiki stránky ke zpracování")
        return state

    print(f"Generuji embeddingy pro {len(pages)} wiki stránek...")

    vector_store = get_wiki_vector_store()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        add_start_index=True,
    )

    for page in pages:
        # print(f"  - Stranka '{page.title}': generuji embedding")

        texts: list[str] = text_splitter.split_text(page.content)

        documents: list[Document] = [
            Document(
                page_content=text,
                metadata={
                    "title": page.title,
                    "file_path": page.file_path,
                    "chunk_index": idx,
                },
            )
            for idx, text in enumerate(texts)
        ]

        # print(f"    -> {len(documents)} chunku")

        vector_store.add_documents(
            documents,
            ids=[f"{page.title}_{idx}" for idx in range(len(documents))],
        )

    return state
