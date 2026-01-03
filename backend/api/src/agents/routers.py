from fastapi import APIRouter, UploadFile

from api.src.agents.schemas import GenerateCourseRequest, GenerateCourseResponse
from agents.course_generator import create_graph
from api.database import SessionSqlSessionDependency

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/generate-course")
async def generate_course(
    course_id: int, db: SessionSqlSessionDependency
) -> GenerateCourseResponse:
    """Endpoint pro generování kurzu z obsahu."""
    app = create_graph()

    result = app.invoke({"course_id": course_id, "db": db})

    course = result.get("course")

    return GenerateCourseResponse(
        title=course.title,
        modules=[module.model_dump() for module in course.modules],
    )
