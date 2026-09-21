import operator
from typing import Annotated, Literal, NotRequired, TypedDict

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session


# ---------- Vstupní data kurzu ----------


class CourseContext(BaseModel):
    """Kontext kurzu načtený z DB, ze kterého se sestavuje image prompt."""

    title: str
    description: str | None
    summary: str | None


# ---------- Specifikace coveru (structured output z LLM) ----------

Tone = Literal["purple", "green", "blue", "rose", "orange"]


class CoverSpec(BaseModel):
    """Proměnné části coveru - jediné, o čem rozhoduje LLM. Styl je pevný v šabloně."""

    mechanism: str = Field(
        description=(
            "Short English clause (max 12 words) completing 'a diagram showing how ...': "
            "the mechanism that is learned, never the course name or its icon. "
            "Example: 'harvests flow through a cooperative to one fair price'."
        )
    )
    left_object: str = Field(
        description="One closed shape for the left third (max 6 words): a tool or carrier of the topic."
    )
    right_schema: str = Field(
        description=(
            "The diagram for the right two thirds (max 15 words) - what you would draw "
            "on a whiteboard. Few elements, recognizable at 200 px width."
        )
    )
    accent_element: str = Field(
        description="The single element to highlight with the accent color (max 6 words): one path, node or result."
    )
    tone: Tone = Field(
        description=(
            "Color tone by domain: purple = mathematics and exact sciences, "
            "green = AI, data and analytics, blue = software development, tools and versioning, "
            "rose or orange = other domains."
        )
    )


# ---------- Výstup generování ----------


class GeneratedImageResult(BaseModel):
    """Výsledek generování obrázku jedním konkrétním modelem."""

    model_name: str
    image_url: str | None = None
    latency_ms: int | None = None
    error: str | None = None


# ---------- State grafu ----------


class ImageGeneratorState(TypedDict):
    course_id: int
    db: Session
    models: list[str]
    # Vstupní data z DB
    course_context: NotRequired[CourseContext]
    # Proměnné části coveru vybrané LLM
    cover_spec: NotRequired[CoverSpec]
    # Finální prompt (šablona + cover_spec), jednotný pro všechny modely
    image_prompt: NotRequired[str]
    # Nastaveno jen uvnitř jedné fan-out větve (přes Send) - který model má tato větev generovat
    model_name: NotRequired[str]
    # Výsledky jednotlivých modelů. Annotated + operator.add, protože do tohoto pole
    # zapisuje paralelně víc větví generate_image a výsledky se musí sčítat, ne přepisovat.
    results: NotRequired[Annotated[list[GeneratedImageResult], operator.add]]
