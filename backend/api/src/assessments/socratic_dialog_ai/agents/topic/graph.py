from langgraph.graph import END, StateGraph

from api.src.assessments.socratic_dialog_ai.agents.topic.state import TopicState
from api.src.assessments.socratic_dialog_ai.agents.topic.nodes import load_context, generate_topic


def create_graph():
    workflow = StateGraph(TopicState)

    workflow.add_node("load_context", load_context)
    workflow.add_node("generate_topic", generate_topic)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "generate_topic")
    workflow.add_edge("generate_topic", END)

    return workflow.compile()
