from abc import ABC, abstractmethod
from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.image_generator.state import GeneratedImageResult, ImageContext, ImageSpec


@dataclass
class ImageGenerationResult:
    """Výsledek běhu image generátoru: načtený kontext, spec a prompt + obrázky všech modelů."""

    context: ImageContext
    image_spec: ImageSpec
    image_prompt: str
    results: list[GeneratedImageResult]


class BaseImageGeneratorService(ABC):
    """Společný service pro generování a porovnání obrázků pomocí LangGraph.

    Potomek dodá zkompilovaný graf a vstupní state (id kurzu / modulu);
    deduplikace modelů, spuštění grafu a seřazení výsledků je společné.
    """

    def __init__(self, db: Session, models_to_compare: list[str]):
        self.db = db
        # Deduplikace se zachováním pořadí - stejný model 2x by v SeaweedFS přepsal sám sebe
        self.models_to_compare = list(dict.fromkeys(models_to_compare))

    @abstractmethod
    def _create_graph(self):
        """Vrátí zkompilovaný LangGraph graf konkrétního generátoru."""

    @abstractmethod
    def _initial_state(self) -> dict:
        """Vrátí pole state specifická pro konkrétní generátor (např. course_id)."""

    async def generate(self) -> ImageGenerationResult:
        """Sestaví a spustí graf, vrátí kontext, prompt a výsledky všech modelů."""
        app = self._create_graph()

        result = await app.ainvoke(
            {
                **self._initial_state(),
                "db": self.db,
                "models": self.models_to_compare,
            }
        )

        order = {name: i for i, name in enumerate(self.models_to_compare)}

        return ImageGenerationResult(
            context=result["context"],
            image_spec=result["image_spec"],
            image_prompt=result["image_prompt"],
            results=sorted(result["results"], key=lambda r: order.get(r.model_name, 0)),
        )
