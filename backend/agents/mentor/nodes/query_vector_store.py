from langchain_core.documents.base import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector
from agents.mentor.state import AgentState, ChunkData
from api.config import Settings
from agents.mentor.state import LearnBlockQueryAttr


embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
connection: str = Settings().postgres.get_connection_string()
collection_name = "course_embeddings"  # Název kolekce pro embeddingy


def query_vector_store(state: AgentState) -> AgentState:
    """Uzlu pro dotazování vektorového úložiště."""
    print("Dotazuji vektorové úložiště...")

    query_attr: LearnBlockQueryAttr | None = state.get("learn_block_query_attr")
    if not query_attr:
        print("Chybí learn_block_query_attr ve state")
        return {"context_chunks": []}  # Vrať prázdné chunky
    
    course_id = query_attr.course_id
    module_id = query_attr.module_id

    vector_store = PGVector(
        embeddings=embeddings,
        collection_name=collection_name,
        connection=connection,
        use_jsonb=True,
    )

    results: list[Document] = vector_store.similarity_search(
        query=state["message"],
        k=10,  # počet nejbližších výsledků
        filter={
            "course_id": course_id,
            "module_id": module_id,
        },
    )

    print(f"✓ Nalezeno {len(results)} relevantních chunků")
    for idx, result in enumerate(results, 1):
        print(f"  {idx}. {result.page_content[:100]}...")

    context_chunks: list[ChunkData] = [
        ChunkData(
            content=result.page_content,
            metadata=result.metadata,
        )
        for result in results
    ]
    state["context_chunks"] = context_chunks
    return state
