

from fastapi import APIRouter

from app.src.courses.routers import router as courses_router

router = APIRouter()

router.include_router(courses_router)