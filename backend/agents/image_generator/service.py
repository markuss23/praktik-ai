from abc import ABC, abstractmethod
from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.image_generator.state import GeneratedImageResult, ImageContext, ImageSpec


@dataclass
class ImageGenerationResult:
    """Výsledek běhu image generátoru: načtený kontext, spec, prompt a vygenerovaný obrázek."""

    context: ImageContext
    image_spec: ImageSpec
    image_prompt: str
    result: GeneratedImageResult


class BaseImageGeneratorService(ABC):
    """Společný service pro generování obrázků pomocí LangGraph.

    Potomek dodá zkompilovaný graf a vstupní state (id kurzu / modulu);
    spuštění grafu a složení výsledku je společné. Image model se bere
    z system_setting, ne ze vstupu.
    """

    def __init__(self, db: Session):
        self.db = db

    @abstractmethod
    def _create_graph(self):
        """Vrátí zkompilovaný LangGraph graf konkrétního generátoru."""

    @abstractmethod
    def _initial_state(self) -> dict:
        """Vrátí pole state specifická pro konkrétní generátor (např. course_id)."""

    async def generate(self) -> ImageGenerationResult:
        """Sestaví a spustí graf, vrátí kontext, prompt a vygenerovaný obrázek."""
        app = self._create_graph()

        result = await app.ainvoke({**self._initial_state(), "db": self.db})

        return ImageGenerationResult(
            context=result["context"],
            image_spec=result["image_spec"],
            image_prompt=result["image_prompt"],
            result=result["result"],
        )
