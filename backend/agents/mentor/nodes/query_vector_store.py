import logging
from langchain_core.documents.base import Document
from agents.vector_store import get_vector_store
from agents.mentor.state import AgentState, ChunkData
from agents.mentor.state import LearnBlockQueryAttr

logger = logging.getLogger(__name__)

MAX_DISTANCE = 0.75


def query_vector_store(state: AgentState) -> AgentState:
    """Uzlu pro dotazování vektorového úložiště."""
    logger.info("Dotazuji vektorové úložiště...")

    query_attr: LearnBlockQueryAttr | None = state.get("learn_block_query_attr")
    if not query_attr:
        logger.warning("Chybí learn_block_query_attr ve state")
        return {"context_chunks": []}  # Vrať prázdné chunky

    course_id = query_attr.course_id
    module_id = query_attr.module_id

    vector_store = get_vector_store()

    # Celý kurz je větší prostor — víc kandidátů, ať se mezi ně dostane i aktuální modul
    search_filter: dict = {"course_id": course_id}
    k = 20
    if state.get("scope", "module") == "module":
        search_filter["module_id"] = module_id
        k = 10

    # Router přepsal navazující dotaz („a proč?“) na samostatnou otázku
    query = state.get("search_query") or state["message"]

    scored: list[tuple[Document, float]] = vector_store.similarity_search_with_score(
        query=query,
        k=k,  # počet nejbližších výsledků
        filter=search_filter,
    )

    # Kosinová vzdálenost (menší = bližší) — chunky mimo téma pryč, ať mentor raději řekne „nevím“
    # ponytail: práh odhadnutý pro text-embedding-3-large, doladit podle eval sady
    results: list[Document] = [doc for doc, distance in scored if distance <= MAX_DISTANCE]

    logger.info(f"✓ Nalezeno {len(results)}/{len(scored)} relevantních chunků")
    for idx, result in enumerate(results, 1):
        logger.debug(f"  {idx}. {result.page_content[:100]}...")

    context_chunks: list[ChunkData] = [
        ChunkData(
            content=result.page_content,
            metadata=result.metadata,
        )
        for result in results
    ]
    state["context_chunks"] = context_chunks
    return state
