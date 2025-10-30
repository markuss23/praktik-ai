from fastapi import Depends, FastAPI
from sqlalchemy import text


from app.database import SessionSqlSessionDependency, init_db

app = FastAPI(docs_url="/")

init_db(create_extensions=True)

@app.get("/sasd/")
async def root(db: SessionSqlSessionDependency):
    print(db.execute(text("Select 1")).all())
    return {"message": "asd"}
