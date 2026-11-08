from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from agents.podcast_generator.nodes import (
    load_context_node,
    synthesize_node,
    write_script_node,
)
from agents.podcast_generator.state import PodcastGeneratorState, PodcastScript


def create_graph():
    """Graf: kontext modulu -> scénář (LLM) -> převod na řeč (TTS)."""
    workflow = StateGraph(PodcastGeneratorState)
    workflow.add_node("load_context", load_context_node)
    workflow.add_node("write_script", write_script_node)
    workflow.add_node("synthesize", synthesize_node)
    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "write_script")
    workflow.add_edge("write_script", "synthesize")
    workflow.add_edge("synthesize", END)
    return workflow.compile()


class ModulePodcastGeneratorService:
    """Vygeneruje podcast (dialog dvou hlasů) k modulu. Vrací scénář a MP3."""

    def __init__(self, db: Session, module_id: int, progress_key: str | None = None):
        self.db = db
        self.module_id = module_id
        self.progress_key = progress_key

    async def generate(self) -> tuple[PodcastScript, bytes]:
        result = await create_graph().ainvoke(
            {"db": self.db, "module_id": self.module_id, "progress_key": self.progress_key}
        )
        return result["script"], result["audio"]
