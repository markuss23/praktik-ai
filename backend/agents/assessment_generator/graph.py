from langgraph.graph import StateGraph, END

from agents.assessment_generator.state import AssessmentState
from agents.assessment_generator.nodes import (
    load_context,
    generate_question,
    persist_session,
)


def should_continue(state: AssessmentState) -> str:
    """Pokud load_context nastavil error, přeskočíme zbytek grafu."""
    if state.get("error"):
        return "end"
    return "continue"


def create_graph():
    """Vytváří graf pro generování assessment otázky."""
    print("Vytvářím assessment generation graf...")
    workflow = StateGraph(AssessmentState)

    # Nodes
    workflow.add_node("load_context", load_context)
    workflow.add_node("generate_question", generate_question)
    workflow.add_node("persist_session", persist_session)

    # Edges
    workflow.set_entry_point("load_context")
    workflow.add_conditional_edges(
        "load_context",
        should_continue,
        {"continue": "generate_question", "end": END},
    )
    workflow.add_edge("generate_question", "persist_session")
    workflow.add_edge("persist_session", END)

    return workflow.compile()
