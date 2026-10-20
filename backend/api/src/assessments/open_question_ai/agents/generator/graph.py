from langgraph.graph import END, StateGraph

from api.src.assessments.open_question_ai.agents.generator.state import GeneratorState
from api.src.assessments.open_question_ai.agents.generator.nodes import (
    load_context,
    generate_question,
)


def create_graph():
    workflow = StateGraph(GeneratorState)

    workflow.add_node("load_context", load_context)
    workflow.add_node("generate_question", generate_question)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "generate_question")
    workflow.add_edge("generate_question", END)

    return workflow.compile()
