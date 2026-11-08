
from pydantic import BaseModel, Field


class GenerateCourseRequest(BaseModel):
    """Request pro generování kurzu"""

    source_path: str


class GenerateCourseResponse(BaseModel):
    """Response po spuštění generování. Výsledek se čte z DB po dokončení."""

    title: str


class CourseGenerationProgressResponse(BaseModel):
    """Response s průběhem AI generování kurzu."""

    step: int = Field(..., description="Aktuální krok (0 = ještě nezapočato)")
    total: int = Field(..., description="Celkový počet kroků")
    label: str = Field(..., description="Popis aktuálního kroku")
    status: str = Field(..., description="pending | running | completed | failed")
    error: str | None = Field(default=None, description="Chybová zpráva (pokud failed)")


class GenerateEmbeddingsResponse(BaseModel):
    """Response s výsledky generování embeddingů"""

    course_id: int = Field(..., description="ID kurzu")
    blocks_processed: int = Field(..., description="Počet zpracovaných learn bloků")
    chunks_created: int = Field(
        ..., description="Počet vytvořených embeddingů (chunků)"
    )
    message: str = Field(
        default="Embeddingy úspěšně vygenerovány", description="Stavová zpráva"
    )


class GenerateImageResponse(BaseModel):
    """Response po vygenerování obrázku a jeho uložení do SeaweedFS"""

    image_spec: dict = Field(..., description="Proměnné části obrázku vybrané LLM")
    image_prompt: str = Field(..., description="Finální prompt poslaný image modelu")
    model_name: str = Field(
        ...,
        description="Image model použitý pro generování (system_setting „image_generator_model“)",
    )
    latency_ms: int = Field(..., description="Doba generování obrázku v ms")
    file_path: str = Field(
        ...,
        description="Cesta obrázku v SeaweedFS (např. „course-images/42/cover.png“)",
    )


class ImageGenerationProgressResponse(BaseModel):
    """Response s průběhem generování obrázku kurzu / modulu (background task)."""

    step: int = Field(..., description="Aktuální krok (0 = ještě nezapočato)")
    total: int = Field(..., description="Celkový počet kroků")
    label: str = Field(..., description="Popis aktuálního kroku")
    status: str = Field(..., description="pending | running | completed | failed")
    error: str | None = Field(default=None, description="Chybová zpráva (pokud failed)")
    result: GenerateImageResponse | None = Field(
        default=None, description="Výsledek po dokončení (pokud completed)"
    )


class ActiveImageGeneration(BaseModel):
    """Právě běžící generování obrázku (pro obnovení sledování po refreshi stránky)."""

    kind: str = Field(..., description="course | module")
    entity_id: int = Field(..., description="course_id, resp. module_id")


class LearnBlocksChatRequest(BaseModel):
    """Request pro chat s learn blocky"""

    learn_block_id: int | None = Field(
        None, description="ID learn blocku (povinné pro scope=module)"
    )
    course_id: int | None = Field(
        None, description="ID kurzu — pro scope=course bez learn blocku"
    )
    message: str = Field(..., description="Zpráva od uživatele (otázka)")


class LearnBlocksChatResponse(BaseModel):
    """Response s odpovědí na otázku"""

    answer: str = Field(..., description="Odpověď vygenerovaná na základě learn blocku")


class WikiChatRequest(BaseModel):
    """Request pro chat nad projektovou wiki"""

    # Endpoint je veřejný
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Zpráva od uživatele (otázka o projektu)",
    )


class WikiChatResponse(BaseModel):
    """Response s odpovědí na otázku o wiki"""

    answer: str = Field(..., description="Odpověď vygenerovaná na základě wiki obsahu")


class WikiSyncResponse(BaseModel):
    """Response s odpovědí pro synchronizaci wiki repozitáře"""

    pages_processed: int = Field(..., description="Počet zpracovaných wiki stránek")
    message: str = Field(
        default="Wiki byla úspěšně synchronizována a re-indexována",
        description="Stavová zpráva",
    )
