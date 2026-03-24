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


class GenerateAssessmentRequest(BaseModel):
    """Request pro generování assessment otázky"""

    module_id: int = Field(..., description="ID modulu")


class GenerateAssessmentResponse(BaseModel):
    """Response s vygenerovanou assessment otázkou"""

    session_id: int = Field(..., description="ID task session")
    generated_question: str = Field(..., description="Vygenerovaná otázka")


class EvaluateAssessmentRequest(BaseModel):
    """Request pro vyhodnocení assessment odpovědi"""

    session_id: int = Field(..., description="ID assessment session")
    user_response: str = Field(..., min_length=1, description="Odpověď studenta")


class EvaluateAssessmentResponse(BaseModel):
    """Response s výsledkem hodnocení"""

    attempt_id: int = Field(..., description="ID pokusu")
    ai_score: int = Field(..., description="Skóre 0-100")
    is_passed: bool = Field(..., description="Zda student uspěl")
    ai_feedback: str = Field(..., description="Zpětná vazba od AI")


class LearnBlocksChatRequest(BaseModel):
    """Request pro chat s learn blocky"""

    learn_block_id: int = Field(..., description="ID learn blocku")
    message: str = Field(..., description="Zpráva od uživatele (otázka)")


class LearnBlocksChatResponse(BaseModel):
    """Response s odpovědí na otázku"""

    answer: str = Field(..., description="Odpověď vygenerovaná na základě learn blocku")
