from langgraph.graph import END, StateGraph

from api.src.assessments.socratic_dialog_ai.agents.dialog.state import DialogState
from api.src.assessments.socratic_dialog_ai.agents.dialog.nodes import load_context, ask


def create_graph():
    workflow = StateGraph(DialogState)

    workflow.add_node("load_context", load_context)
    workflow.add_node("ask", ask)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "ask")
    workflow.add_edge("ask", END)

    return workflow.compile()
