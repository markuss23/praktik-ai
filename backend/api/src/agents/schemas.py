from pydantic import BaseModel


class GenerateCourseRequest(BaseModel):
    """Request pro generování kurzu"""

    source_path: str


class GenerateCourseResponse(BaseModel):
    """Response s vygenerovaným kurzem"""

    title: str
    modules: list[dict]
