"""LangGraph pro RAG chat nad wiki obsahem."""

from langgraph.graph import StateGraph, END

from agents.wiki.mentor.state import WikiMentorState
from agents.wiki.mentor.nodes import query_vector_store_node, generate_answer_node


def create_graph():
    """RAG chat: Query -> Generate."""
    print("Vytvářím wiki mentor graf...")
    workflow = StateGraph(WikiMentorState)

    workflow.add_node("query_vector_store", query_vector_store_node)
    workflow.add_node("generate_answer", generate_answer_node)

    workflow.set_entry_point("query_vector_store")
    workflow.add_edge("query_vector_store", "generate_answer")
    workflow.add_edge("generate_answer", END)

    return workflow.compile()
