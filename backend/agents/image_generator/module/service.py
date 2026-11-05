from sqlalchemy.orm import Session

from agents.image_generator.graph import create_image_graph
from agents.image_generator.module.load_context import load_module_context_node
from agents.image_generator.module.prompts import (
    DEFAULT_PROMPT,
    SETTING_KEY,
    render_user_prompt,
)
from agents.image_generator.module.state import ModuleImageGeneratorState
from agents.image_generator.nodes import make_build_prompt_node
from agents.image_generator.service import BaseImageGeneratorService

LABEL = "modulu"


def create_graph():
    """Vytváří graf uzlů pro generování obrázku modulu."""
    return create_image_graph(
        state_schema=ModuleImageGeneratorState,
        load_context_node=load_module_context_node,
        build_prompt_node=make_build_prompt_node(
            setting_key=SETTING_KEY,
            default_prompt=DEFAULT_PROMPT,
            render_user_prompt=render_user_prompt,
            label=LABEL,
        ),
        label=LABEL,
    )


class ModuleImageGeneratorService(BaseImageGeneratorService):
    """Service pro generování obrázku modulu pomocí LangGraph."""

    def __init__(self, db: Session, module_id: int, progress_key: str | None = None):
        super().__init__(db, progress_key)
        self.module_id = module_id

    def _create_graph(self):
        return create_graph()

    def _initial_state(self) -> dict:
        return {"module_id": self.module_id}
