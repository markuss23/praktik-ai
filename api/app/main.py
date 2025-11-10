from fastapi import FastAPI
from sqlalchemy import text


from app.database import SessionSqlSessionDependency, init_db
from app.src.routers import router as api_router
app = FastAPI(docs_url="/")

init_db(create_extensions=True)


@app.get("/health")
async def root(db: SessionSqlSessionDependency):
    print(db.execute(text("Select 1")).all())
    return {"message": "ok"}


app.include_router(api_router, prefix="/api/v1")