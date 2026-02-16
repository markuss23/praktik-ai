from pydantic import BaseModel, Field


class GenerateCourseRequest(BaseModel):
    """Request pro generování kurzu"""

    source_path: str


class GenerateCourseResponse(BaseModel):
    """Response s vygenerovaným kurzem"""

    title: str
    modules: list[dict]


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


class LearnBlocksChatRequest(BaseModel):
    """Request pro chat s learn blocky"""

    learn_block_id: int = Field(..., description="ID learn blocku")
    message: str = Field(..., description="Zpráva od uživatele (otázka)")


class LearnBlocksChatResponse(BaseModel):
    """Response s odpovědí na otázku"""

    answer: str = Field(..., description="Odpověď vygenerovaná na základě learn blocku")
