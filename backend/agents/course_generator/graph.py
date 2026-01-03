from langgraph.graph import StateGraph, END

from agents.course_generator.state import AgentState
from agents.course_generator.nodes import (
    load_data_from_db_node,
    load_data_node,
    summarize_content_node,
    plan_content_node,
)


def create_graph():
    """Vytváří graf uzlů pro generování kurzu."""
    print("Vytvářím graf uzlů...")
    workflow = StateGraph(AgentState)

    # nodes
    workflow.add_node("load_data_db", load_data_from_db_node)
    workflow.add_node("load_data", load_data_node)
    workflow.add_node("summarize_content", summarize_content_node)
    workflow.add_node("plan_content", plan_content_node)

    # edges
    workflow.set_entry_point("load_data_db")
    workflow.add_edge("load_data_db", "load_data")
    workflow.add_edge("load_data", "summarize_content")
    workflow.add_edge("summarize_content", "plan_content")
    workflow.add_edge("plan_content", END)

    return workflow.compile()
