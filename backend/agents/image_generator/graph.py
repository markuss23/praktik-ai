from langgraph.graph import StateGraph, END
from langgraph.types import Send

from agents.image_generator.state import ImageGeneratorState
from agents.image_generator.nodes import (
    load_course_context_node,
    build_prompt_node,
    generate_image_node,
    collect_results_node,
)


def _fan_out_to_models(state: ImageGeneratorState) -> list[Send]:
    """Po sestavení promptu rozešle stejný prompt paralelně na každý model."""
    return [
        Send(
            "generate_image",
            {
                "model_name": model_name,
                "image_prompt": state["image_prompt"],
            },
        )
        for model_name in state["models"]
    ]


def create_graph():
    """Vytváří graf uzlů pro generování a porovnání obrázků kurzu."""
    print("Vytvářím graf uzlů pro image generator agenta...")
    workflow = StateGraph(ImageGeneratorState)

    # nodes
    workflow.add_node("load_course_context", load_course_context_node)
    workflow.add_node("build_prompt", build_prompt_node)
    workflow.add_node("generate_image", generate_image_node)
    workflow.add_node("collect_results", collect_results_node)

    # edges
    workflow.set_entry_point("load_course_context")
    workflow.add_edge("load_course_context", "build_prompt")
    workflow.add_conditional_edges(
        "build_prompt", _fan_out_to_models, ["generate_image"]
    )
    workflow.add_edge("generate_image", "collect_results")
    workflow.add_edge("collect_results", END)

    return workflow.compile()
