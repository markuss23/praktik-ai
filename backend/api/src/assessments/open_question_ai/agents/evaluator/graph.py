from langgraph.graph import StateGraph, END

from api.src.assessments.open_question_ai.agents.evaluator.state import EvaluatorState
from api.src.assessments.open_question_ai.agents.evaluator.nodes import (
    load_context,
    evaluate_answer,
    # persist_result,
)


def should_continue(state: EvaluatorState) -> str:
    if state.get("error"):
        return "end"
    return "continue"


def create_graph():
    workflow = StateGraph(EvaluatorState)

    workflow.add_node("load_context", load_context)
    workflow.add_node("evaluate_answer", evaluate_answer)
    # workflow.add_node("persist_result", persist_result)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "evaluate_answer")
    workflow.add_edge("evaluate_answer", END)
    # workflow.add_conditional_edges(
    #     "load_context",
    #     should_continue,
    #     {"continue": "evaluate_answer", "end": END},
    # )
    # workflow.add_edge("evaluate_answer", "persist_result")
    # workflow.add_edge("persist_result", END)

    return workflow.compile()
