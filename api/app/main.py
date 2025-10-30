from fastapi import Depends, FastAPI
from sqlalchemy import text


from app.database import SessionSqlSessionDependency

app = FastAPI(docs_url="/")


@app.get("/sasd/")
async def root(db: SessionSqlSessionDependency):
    print(db.execute(text("Select 1")).all())
    return {"message": "asd"}
