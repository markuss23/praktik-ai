from collections.abc import Callable

from langgraph.graph import END, StateGraph

from agents.image_generator.nodes import generate_image_node
from agents.image_generator.state import ImageGeneratorState


def create_image_graph(
    *,
    state_schema: type[ImageGeneratorState],
    load_context_node: Callable,
    build_prompt_node: Callable,
    label: str,
):
    """Sestaví a zkompiluje graf: načtení kontextu -> prompt -> generování obrázku.

    Společná kostra pro všechny image generátory; liší se jen state, node pro načtení
    kontextu z DB a node pro sestavení promptu. Image model se nebere ze vstupu,
    ale z system_setting.

    Args:
        state_schema: TypedDict state grafu (potomek ImageGeneratorState s vlastním id).
        load_context_node: Node, který z DB naplní ``state["context"]``.
        build_prompt_node: Node, který z kontextu sestaví ``image_spec`` a ``image_prompt``.
        label: Krátký popis do logu, např. "kurzu" nebo "modulu".
    """
    print(f"Vytvářím graf uzlů pro image generator agenta ({label})...")
    workflow = StateGraph(state_schema)

    # nodes
    workflow.add_node("load_context", load_context_node)
    workflow.add_node("build_prompt", build_prompt_node)
    workflow.add_node("generate_image", generate_image_node)

    # edges
    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "build_prompt")
    workflow.add_edge("build_prompt", "generate_image")
    workflow.add_edge("generate_image", END)

    return workflow.compile()
