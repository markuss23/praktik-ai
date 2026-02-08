"""LangGraph pro generování embeddingů."""

from langgraph.graph import StateGraph, END

from agents.embedding_generator.state import AgentState
from agents.embedding_generator.nodes import (
    load_course_data_node,
    generate_embeddings_node,
    # save_embeddings_node,
)


def create_graph():
    """Vytváří graf uzlů pro generování embeddingů."""
    print("Vytvářím graf uzlů pro embeddingy...")
    workflow = StateGraph(AgentState)

    # nodes
    workflow.add_node("load_course_data", load_course_data_node)
    workflow.add_node("generate_embeddings", generate_embeddings_node)
    # workflow.add_node("save_embeddings", save_embeddings_node)

    # edges
    workflow.set_entry_point("load_course_data")

    workflow.add_edge("load_course_data", "generate_embeddings")
    workflow.add_edge("generate_embeddings", END)
    # workflow.add_edge("generate_embeddings", "save_embeddings")
    # workflow.add_edge("save_embeddings", END)

    return workflow.compile()
