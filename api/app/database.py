from typing import Annotated, Any, Generator
from fastapi import Depends
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.session import Session

from app.config import settings

CONN_STRING: str = f"postgresql+psycopg://{settings.db.user}:{settings.db.password}@{settings.db.host}:{settings.db.port}"


engine: Engine = create_engine(CONN_STRING, echo=True)

SessionLocal: sessionmaker[Session] = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


def get_sql() -> Generator[Session, Any, None]:
    """funkce vytváří, poskytuje a následně uzavírá databázovou relaci (session) pro každý HTTP požadavek."""
    db: Session = SessionLocal()
    try:
        # Dočasně předá kontrolu zpět volajícímu a poskytne mu databázovou relaci
        yield db
    finally:
        db.close()


SessionSqlSessionDependency = Annotated[Session, Depends(get_sql)]
