from datetime import datetime

from pydantic import BaseModel, Field

from api.enums import QuestionType


class GenerateCourseRequest(BaseModel):
    """Request pro generování kurzu"""

    source_path: str


class GenerateCourseResponse(BaseModel):
    """Response s vygenerovaným kurzem"""

    title: str
    modules: list[dict]


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


class GeneratePracticeQuestionRequest(BaseModel):
    """Request pro generování personalizované procvičovací otázky"""

    module_id: int = Field(..., description="ID modulu")
    question_type: QuestionType = Field(..., description="Typ otázky: open nebo closed")


class PracticeQuestionOption(BaseModel):
    """Jedna možnost uzavřené otázky (bez is_correct — skrytý před klientem)"""

    text: str


class GeneratePracticeQuestionResponse(BaseModel):
    """Response s vygenerovanou procvičovací otázkou"""

    user_question_id: int = Field(..., description="ID uložené otázky")
    question_type: QuestionType
    generated_question: str = Field(..., description="Vygenerovaná otázka")
    options: list[PracticeQuestionOption] | None = Field(
        default=None, description="Možnosti (pouze pro closed otázky)"
    )


class EvaluatePracticeAnswerRequest(BaseModel):
    """Request pro vyhodnocení odpovědi na procvičovací otázku"""

    user_question_id: int = Field(..., description="ID procvičovací otázky")
    user_input: str = Field(..., min_length=1, description="Odpověď studenta")


class EvaluatePracticeAnswerResponse(BaseModel):
    """Response s výsledkem vyhodnocení procvičovací odpovědi"""

    attempt_id: int = Field(..., description="ID pokusu")
    is_correct: bool = Field(..., description="Zda je odpověď správná")
    ai_response: str | None = Field(
        default=None, description="Zpětná vazba od AI (pouze pro open otázky)"
    )


class PracticeAttempt(BaseModel):
    """Jeden pokus na procvičovací otázku"""

    attempt_id: int
    user_input: str
    ai_response: str | None
    is_correct: bool | None
    created_at: datetime


class PracticeQuestionWithAttempts(BaseModel):
    """Procvičovací otázka s historií pokusů"""

    user_question_id: int
    question_type: QuestionType
    generated_question: str
    options: list[PracticeQuestionOption] | None
    attempts: list[PracticeAttempt]
    created_at: datetime


class LearnBlocksChatRequest(BaseModel):
    """Request pro chat s learn blocky"""

    learn_block_id: int = Field(..., description="ID learn blocku")
    message: str = Field(..., description="Zpráva od uživatele (otázka)")


class LearnBlocksChatResponse(BaseModel):
    """Response s odpovědí na otázku"""

    answer: str = Field(..., description="Odpověď vygenerovaná na základě learn blocku")
