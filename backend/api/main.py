import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


from agents.wiki.agent.scheduler import (
    start_wiki_sync_scheduler,
    stop_wiki_sync_scheduler,
)
from api.config import settings
from api.database import SessionSqlSessionDependency, init_db
from api.seed import seed_db
from api.src.routers import router as api_router

# uvicorn i gunicorn konfigurují jen své loggery; root (= naše logger.info) by jinak padal na WARNING bez formátu
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s [%(process)d] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_wiki_sync_scheduler()
    yield
    stop_wiki_sync_scheduler()


app = FastAPI(docs_url="/", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(
    request: Request, exc: IntegrityError
) -> JSONResponse:
    logger.error("Integrity error: %s", exc)
    return JSONResponse(
        status_code=400,
        content={"detail": "Porušení integritního omezení databáze"},
    )


@app.exception_handler(httpx.HTTPError)
async def storage_error_handler(request: Request, exc: httpx.HTTPError) -> JSONResponse:
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 404:
        return JSONResponse(status_code=404, content={"detail": "Soubor není v úložišti"})
    logger.error("Externí služba selhala: %s", exc, exc_info=True)
    return JSONResponse(status_code=502, content={"detail": "Úložiště souborů je nedostupné"})


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
async def health():
    """Liveness: proces běží. Závislosti se tu schválně nekontrolují."""
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready(db: SessionSqlSessionDependency) -> JSONResponse:
    """Readiness: DB a úložiště odpovídají. Při výpadku 503."""
    checks = {}
    try:
        db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        logger.exception("Health check: DB nedostupná")
        checks["db"] = "error"
    try:
        # jakákoli odpověď < 500 = filer žije
        r = httpx.get(settings.seaweedfs.filer_url, timeout=2)
        checks["storage"] = "ok" if r.status_code < 500 else "error"
    except httpx.HTTPError:
        logger.exception("Health check: úložiště nedostupné")
        checks["storage"] = "error"
    ok = all(v == "ok" for v in checks.values())
    return JSONResponse(status_code=200 if ok else 503, content=checks)


app.include_router(api_router, prefix="/api/v1")
