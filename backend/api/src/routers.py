from fastapi import APIRouter, Depends

from api.src.courses.routers import (
    router as courses_router,
    public_router as courses_public_router,
)
from api.src.modules.routers import router as modules_router
from api.src.activities.routers import router as activities_router
from api.src.agents.routers import router as agents_router
from api.src.auth.routers import router as auth_router
from api.src.users.routers import router as users_router
from api.src.enrollments.routers import router as enrollments_router
from api.src.feedbacks.routers import router as feedbacks_router
from api.src.catalogs.routers import router as catalogs_router
from api.src.superadmin.routers import router as superadmin_router
from api.src.module_tickets.routers import router as module_tickets_router
from api.src.publicDB.resources.routers import router as resources_router
from api.src.publicDB.resources.routers import public_router as resources_public_router
from api.src.publicDB.reviews.routers import router as review_router
from api.src.publicDB.rating.routers import router as rating_router
from api.dependencies import auth

router = APIRouter()

# Auth router bez autentizace
router.include_router(auth_router)
router.include_router(courses_public_router)
router.include_router(catalogs_router)

# Všechny ostatní routery s povinnou autentizací
router.include_router(courses_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(modules_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(activities_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(agents_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(users_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(enrollments_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(feedbacks_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(superadmin_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(
    module_tickets_router, dependencies=[Depends(auth.get_current_user)]
)
# --
# router.include_router(categories_router)
# router.include_router(courses_router)
# router.include_router(modules_router)
# router.include_router(activities_router)
# router.include_router(agents_router)

# Veřejná DB routers

# Bez autentizace
router.include_router(resources_public_router)

router.include_router(resources_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(review_router, dependencies=[Depends(auth.get_current_user)])
router.include_router(rating_router, dependencies=[Depends(auth.get_current_user)])
