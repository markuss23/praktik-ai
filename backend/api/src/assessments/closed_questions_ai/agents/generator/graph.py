from langgraph.graph import END, StateGraph

from api.src.assessments.closed_questions_ai.agents.generator.state import (
    GeneratorState,
)
from api.src.assessments.closed_questions_ai.agents.generator.nodes import (
    generate_questions,
    load_context,
)


def create_graph():
    workflow = StateGraph(GeneratorState)

    workflow.add_node("load_context", load_context)
    workflow.add_node("generate_questions", generate_questions)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "generate_questions")
    workflow.add_edge("generate_questions", END)

    return workflow.compile()
