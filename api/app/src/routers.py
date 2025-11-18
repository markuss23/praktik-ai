from fastapi import APIRouter

from app.src.courses.routers import router as courses_router
from app.src.modules.routers import router as modules_router
from app.src.activities.routers import router as activities_router

router = APIRouter()

router.include_router(courses_router)
router.include_router(modules_router)
router.include_router(activities_router)
