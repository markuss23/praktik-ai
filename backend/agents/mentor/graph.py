"""LangGraph pro generování embeddingů."""

from langgraph.graph import StateGraph, END

from agents.mentor.state import AgentState
from agents.mentor.nodes import (
    load_learn_block_data,
    query_vector_store,
    rerank_documents,
    generate_answer,
)


def create_graph():
    """RAG s rerankingem: Load → Query → Rerank → Generate."""
    print("Vytvářím RAG mentor graf...")
    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("load_learn_block_data", load_learn_block_data)
    workflow.add_node("query_vector_store", query_vector_store)
    workflow.add_node("rerank_documents", rerank_documents)
    workflow.add_node("generate_answer", generate_answer)

    # RAG Flow
    workflow.set_entry_point("load_learn_block_data") 
    workflow.add_edge("load_learn_block_data", "query_vector_store")
    workflow.add_edge("query_vector_store", "rerank_documents")
    workflow.add_edge("rerank_documents", "generate_answer")
    workflow.add_edge("generate_answer", END)
    return workflow.compile()
