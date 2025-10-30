from fastapi import Depends, FastAPI
from sqlalchemy import  text

# from .dependencies import get_query_token, get_token_header
# from .internal import admin
# from .routers import items, users

from app.database import SessionSqlSessionDependency
from app.config import settings

app = FastAPI(docs_url="/")


# app.include_router(users.router)
# app.include_router(items.router)
# app.include_router(
#     admin.router,
#     prefix="/admin",
#     tags=["admin"],
#     dependencies=[Depends(get_token_header)],
#     responses={418: {"description": "I'm a teapot"}},
# )


@app.get("/sasd/")
async def root(db: SessionSqlSessionDependency):
    print( db.execute(text("Select 1")).all())
    return {"message":"asd"}
