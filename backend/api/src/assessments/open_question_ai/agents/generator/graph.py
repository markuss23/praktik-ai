from langgraph.graph import END, StateGraph

from api.src.assessments.open_question_ai.agents.generator.state import GeneratorState
from api.src.assessments.open_question_ai.agents.generator.nodes.load_context import (
    load_context,
)


def create_graph():
    workflow = StateGraph(GeneratorState)

    workflow.add_node("load_context", load_context)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", END)

    return workflow.compile()
