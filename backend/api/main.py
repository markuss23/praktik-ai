from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text


from api.database import SessionSqlSessionDependency, init_db
from api.src.routers import router as api_router
from api.dependencies import auth

app = FastAPI(docs_url="/")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

init_db(create_extensions=True)


@app.get("/health")
async def root(db: SessionSqlSessionDependency):
    print(db.execute(text("Select 1")).all())
    return {"message": "ok"}


app.include_router(api_router, prefix="/api/v1")
