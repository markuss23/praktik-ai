from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.module_image_generator.graph import create_graph
from agents.module_image_generator.state import (
    GeneratedImageResult,
    ModuleContext,
    ModuleImageSpec,
)


@dataclass
class ModuleImageGenerationResult:
    module_context: ModuleContext
    image_spec: ModuleImageSpec
    image_prompt: str
    results: list[GeneratedImageResult]


class ModuleImageGeneratorService:
    """Service pro generování a porovnání obrázků modulu pomocí LangGraph."""

    def __init__(self, db: Session, module_id: int, models_to_compare: list[str]):
        self.db = db
        self.module_id = module_id
        # Deduplikace se zachováním pořadí - stejný model 2x by v ZIPu přepsal sám sebe
        self.models_to_compare = list(dict.fromkeys(models_to_compare))

    async def generate(self) -> ModuleImageGenerationResult:
        """Sestaví a spustí graf, vrátí kontext modulu, prompt a výsledky všech modelů."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "module_id": self.module_id,
                "db": self.db,
                "models": self.models_to_compare,
            }
        )

        order = {name: i for i, name in enumerate(self.models_to_compare)}

        return ModuleImageGenerationResult(
            module_context=result["module_context"],
            image_spec=result["image_spec"],
            image_prompt=result["image_prompt"],
            results=sorted(result["results"], key=lambda r: order.get(r.model_name, 0)),
        )
