from langgraph.graph import StateGraph, END

from agents.practice_question_generator.state import GeneratorState
from agents.practice_question_generator.nodes import (
    load_context,
    generate_question,
    persist_question,
)


def should_continue(state: GeneratorState) -> str:
    if state.get("error"):
        return "end"
    return "continue"


def create_graph():
    workflow = StateGraph(GeneratorState)

    workflow.add_node("load_context", load_context)
    workflow.add_node("generate_question", generate_question)
    workflow.add_node("persist_question", persist_question)

    workflow.set_entry_point("load_context")
    workflow.add_conditional_edges(
        "load_context",
        should_continue,
        {"continue": "generate_question", "end": END},
    )
    workflow.add_conditional_edges(
        "generate_question",
        should_continue,
        {"continue": "persist_question", "end": END},
    )
    workflow.add_edge("persist_question", END)

    return workflow.compile()
