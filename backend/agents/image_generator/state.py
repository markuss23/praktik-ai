from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# ---------- Společný kontext (číselníky kurzu) ----------


class ImageContext(BaseModel):
    """Společná část kontextu pro všechny image generátory.

    Obsahuje zařazení kurzu v číselnících (předmět, blok, cílová skupina),
    podle kterých LLM volí obor, tón a úroveň abstrakce. Konkrétní agenti
    (kurz, modul) ji rozšiřují o svá vlastní textová pole.
    """

    subject_name: str | None = None
    block_name: str | None = None
    block_description: str | None = None
    target_name: str | None = None
    target_description: str | None = None


# ---------- Specifikace obrázku (structured output z LLM) ----------

Tone = Literal["purple", "green", "blue", "rose", "orange"]


class ImageSpec(BaseModel):
    """Proměnné části obrázku - jediné, o čem rozhoduje LLM. Styl je pevný v šabloně."""

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
    """Výsledek generování obrázku image modelem nastaveným v system_setting."""

    model_name: str
    image_url: str  # data URI "data:<mime>;base64,<data>"
    latency_ms: int


# ---------- State grafu ----------


class ImageGeneratorState(TypedDict):
    """Společný state grafu.

    Konkrétní agenti přidávají jen svůj vstupní identifikátor (course_id / module_id);
    ``context`` plní jejich vlastní load node.
    """

    db: Session
    # Vstupní data z DB (CourseContext / ModuleContext)
    context: NotRequired[ImageContext]
    # Proměnné části obrázku vybrané LLM
    image_spec: NotRequired[ImageSpec]
    # Finální prompt (šablona + image_spec)
    image_prompt: NotRequired[str]
    # Vygenerovaný obrázek (model se bere z system_setting, viz generate_image_node)
    result: NotRequired[GeneratedImageResult]
