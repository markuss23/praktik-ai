"""Node pro generování embeddingů z wiki stránek a backend dokumentace."""

import logging
from langchain_core.documents.base import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from agents.wiki.agent.state import WikiAgentState, WikiPageData
from agents.wiki.vector_store import get_wiki_vector_store

logger = logging.getLogger(__name__)


def generate_embeddings_node(state: WikiAgentState) -> WikiAgentState:
    """Rozseká stránky na chunky a znovu jimi naplní wiki kolekci.

    Kolekce se před indexací celá vymaže, aby v ní nezůstaly chunky ze
    smazaných nebo zkrácených stránek. Během reindexace 
    proto wiki chat může krátce odpovídat z neúplného indexu.
    ID chunku = zdroj + title + index, takže se stránky ze dvou zdrojů
    ani různá README.md navzájem nepřepisují.
    """
    pages: list[WikiPageData] = state.get("pages", [])

    if not pages:
        # bez stránek index nemažeme — spíš selhal clone/načtení než že je vše smazané
        logger.warning("Žádné stránky ke zpracování, index ponechávám beze změny")
        return state

    logger.info(f"Generuji embeddingy pro {len(pages)} stránek...")

    vector_store = get_wiki_vector_store()
    vector_store.delete_collection()
    vector_store.create_collection()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        add_start_index=True,
    )

    for page in pages:
        texts: list[str] = text_splitter.split_text(page.content)
        if not texts:
            continue

        documents: list[Document] = [
            Document(
                page_content=text,
                metadata={
                    "title": page.title,
                    "file_path": page.file_path,
                    "source": page.source,
                    "chunk_index": idx,
                },
            )
            for idx, text in enumerate(texts)
        ]

        vector_store.add_documents(
            documents,
            ids=[f"{page.source}:{page.title}:{idx}" for idx in range(len(documents))],
        )

    return state
