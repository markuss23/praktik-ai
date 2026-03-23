import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


from api.database import SessionSqlSessionDependency, init_db
from api.seed import seed_db
from api.src.routers import router as api_router
from api.dependencies import auth

logger = logging.getLogger(__name__)

app = FastAPI(docs_url="/")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.error("Integrity error: %s", exc)
    return JSONResponse(
        status_code=400,
        content={"detail": "Porušení integritního omezení databáze"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Nečekávaná chyba serveru"},
    )

init_db(create_extensions=True)
seed_db()


@app.get("/health")
async def root(db: SessionSqlSessionDependency):
    print(db.execute(text("Select 1")).all())
    return {"message": "ok"}


app.include_router(api_router, prefix="/api/v1")
