from fastapi import APIRouter, Depends

from api.src.categories.routers import router as categories_router
from api.src.courses.routers import router as courses_router
from api.src.modules.routers import router as modules_router
from api.src.activities.routers import router as activities_router
from api.src.agents.routers import router as agents_router
from api.src.auth.routers import router as auth_router
from api.dependencies import auth

router = APIRouter()

# Auth router bez autentizace
router.include_router(auth_router)

# Všechny ostatní routery s povinnou autentizací
router.include_router(categories_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(courses_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(modules_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(activities_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(agents_router, dependencies=[Depends(auth.get_current_user)])
# --
# router.include_router(categories_router)
# router.include_router(courses_router)
# router.include_router(modules_router)
# router.include_router(activities_router)
# router.include_router(agents_router)