"""LangGraph pro synchronizaci a indexování GitHub wiki."""

from langgraph.graph import StateGraph, END

from agents.wiki.agent.state import WikiAgentState
from agents.wiki.agent.nodes import (
    clone_or_pull_wiki_node,
    load_pages_node,
    generate_embeddings_node,
)


def create_graph():
    """Vytváří graf uzlů pro synchronizaci a indexování wiki."""
    print("Vytvářím graf uzlů pro wiki agenta...")
    workflow = StateGraph(WikiAgentState)

    # nodes
    workflow.add_node("clone_or_pull_wiki", clone_or_pull_wiki_node)
    workflow.add_node("load_pages", load_pages_node)
    workflow.add_node("generate_embeddings", generate_embeddings_node)

    # edges
    workflow.set_entry_point("clone_or_pull_wiki")

    workflow.add_edge("clone_or_pull_wiki", "load_pages")
    workflow.add_edge("load_pages", "generate_embeddings")
    workflow.add_edge("generate_embeddings", END)

    return workflow.compile()
