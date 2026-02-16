# """Node pro generování embeddingů."""
from langchain_core.documents.base import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter

from api.config import settings

from agents.embedding_generator.state import AgentState
from agents.embedding_generator.state import LearnBlockData
# from api import models

embeddings = OpenAIEmbeddings(model="text-embedding-3-large")


def generate_embeddings_node(state: AgentState) -> AgentState:
    learn_blocks: list[LearnBlockData] = state.get("learn_blocks", [])
    connection: str = settings.postgres.get_connection_string()
    collection_name = "course_embeddings"  # Název kolekce pro embeddingy

    if not learn_blocks:
        print("Žádné learn blocky k zpracování")
        return state

    print(f"Generuji embeddingy pro {len(learn_blocks)} learn blocků...")

    vector_store = PGVector(
        embeddings=embeddings,
        collection_name=collection_name,
        connection=connection,
        use_jsonb=True,
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # chunk size (characters)
        chunk_overlap=100,  # chunk overlap (characters)
        add_start_index=True,  # track index in original document
    )

    for learn_block in learn_blocks:
        print(f"  • Learn block {learn_block.learn_id}: generuji embedding")

        texts: list[str] = text_splitter.split_text(learn_block.content)

        documents: list[Document] = [
            Document(
                page_content=text,
                metadata={
                    "learn_block_id": learn_block.learn_id,
                    "module_id": learn_block.module_id,
                    "course_id": state["course_id"],
                    "position": learn_block.position,
                    "chunk_index": idx,
                },
            )
            for idx, text in enumerate(texts)
        ]

        print(f"    → {len(documents)} chunků")

        vector_store.add_documents(
            documents,
            ids=[f"{learn_block.learn_id}_{idx}" for idx in range(len(documents))],
        )

    return state
