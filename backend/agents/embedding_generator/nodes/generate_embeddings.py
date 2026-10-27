# """Node pro generování embeddingů."""
import logging
from langchain_core.documents.base import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from agents.vector_store import get_vector_store
from agents.embedding_generator.state import AgentState
from agents.embedding_generator.state import LearnBlockData

logger = logging.getLogger(__name__)


def generate_embeddings_node(state: AgentState) -> AgentState:
    learn_blocks: list[LearnBlockData] = state.get("learn_blocks", [])

    if not learn_blocks:
        logger.warning("Žádné learn blocky k zpracování")
        return state

    logger.info(f"Generuji embeddingy pro {len(learn_blocks)} learn blocků...")

    vector_store = get_vector_store()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # chunk size (characters)
        chunk_overlap=100,  # chunk overlap (characters)
        add_start_index=True,  # track index in original document
    )

    for learn_block in learn_blocks:
        logger.info(f"  • Learn block {learn_block.learn_id}: generuji embedding")

        texts: list[str] = text_splitter.split_text(learn_block.content)

        documents: list[Document] = [
            Document(
                page_content=text,
                metadata={
                    "learn_block_id": learn_block.learn_id,
                    "module_id": learn_block.module_id,
                    "course_id": state["course_id"],
                    "chunk_index": idx,
                },
            )
            for idx, text in enumerate(texts)
        ]

        logger.info(f"    → {len(documents)} chunků")

        vector_store.add_documents(
            documents,
            ids=[f"{learn_block.learn_id}_{idx}" for idx in range(len(documents))],
        )

    return state
