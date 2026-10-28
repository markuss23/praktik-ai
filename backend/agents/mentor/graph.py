"""LangGraph pro generování embeddingů."""

import logging
from langgraph.graph import StateGraph, END

from agents.mentor.state import AgentState
from agents.mentor.nodes import (
    load_learn_block_data,
    route_query,
    query_vector_store,
    rerank_documents,
    generate_answer,
)

logger = logging.getLogger(__name__)


def create_graph():
    """RAG s rerankingem: Load → Route → (Query → Rerank) → Generate."""
    logger.info("Vytvářím RAG mentor graf...")
    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("load_learn_block_data", load_learn_block_data)
    workflow.add_node("route_query", route_query)
    workflow.add_node("query_vector_store", query_vector_store)
    workflow.add_node("rerank_documents", rerank_documents)
    workflow.add_node("generate_answer", generate_answer)

    # RAG Flow
    workflow.set_entry_point("load_learn_block_data") 
    workflow.add_edge("load_learn_block_data", "route_query")
    # Když stačí historie (např. „na co jsem se ptal?“), hledání se přeskočí
    workflow.add_conditional_edges(
        "route_query",
        lambda state: "query_vector_store" if state.get("needs_retrieval", True) else "generate_answer",
    )
    workflow.add_edge("query_vector_store", "rerank_documents")
    workflow.add_edge("rerank_documents", "generate_answer")
    workflow.add_edge("generate_answer", END)
    return workflow.compile()
