import operator
from typing import Annotated, NotRequired, TypedDict

from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.image_generator.state import CoverSpec, GeneratedImageResult

# CoverSpec i GeneratedImageResult se přebírají beze změny z image_generator -
# designový systém (styl obrázku, tón podle oboru) je pro kurz i modul stejný.
ModuleImageSpec = CoverSpec


# ---------- Vstupní data modulu ----------


class ModuleContext(BaseModel):
    """Kontext modulu načtený z DB, ze kterého se sestavuje image prompt."""

    module_title: str
    learn_block_content: str | None
    course_title: str
    subject_name: str | None = None
    block_name: str | None = None
    block_description: str | None = None
    target_name: str | None = None
    target_description: str | None = None


# ---------- State grafu ----------


class ModuleImageGeneratorState(TypedDict):
    module_id: int
    db: Session
    models: list[str]
    # Vstupní data z DB
    module_context: NotRequired[ModuleContext]
    # Proměnné části obrázku vybrané LLM
    image_spec: NotRequired[ModuleImageSpec]
    # Finální prompt (šablona + image_spec), jednotný pro všechny modely
    image_prompt: NotRequired[str]
    # Nastaveno jen uvnitř jedné fan-out větve (přes Send) - který model má tato větev generovat
    model_name: NotRequired[str]
    # Výsledky jednotlivých modelů. Annotated + operator.add, protože do tohoto pole
    # zapisuje paralelně víc větví generate_image a výsledky se musí sčítat, ne přepisovat.
    results: NotRequired[Annotated[list[GeneratedImageResult], operator.add]]
