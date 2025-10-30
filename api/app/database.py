from typing import Annotated, Any, Generator
from fastapi import Depends
from psycopg import ProgrammingError
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.session import Session

from app.models import Base
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


def init_db(create_extensions: bool = True) -> None:
    """
    Inicializuje databázi:
      - volitelně vytvoří rozšíření (pg_trgm pro GIN trigram indexy),
      - vytvoří všechny tabulky dle Base.metadata.

    Spouštěj jednorázově (např. při startu aplikace nebo lokálně).
    """
    with engine.begin() as conn:
        if create_extensions:
            try:
                # Pro trigram indexy (používá se u ix_course_title_trgm)
                conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            except ProgrammingError as e:
                # Typicky nedostatečná práva — necháme projít dál, tabulky se stejně vytvoří.
                # Můžeš sem dát logging.warning(...)
                pass

        # Vytvoření všech tabulek a enum typů
        Base.metadata.create_all(bind=conn)


SessionSqlSessionDependency = Annotated[Session, Depends(get_sql)]
