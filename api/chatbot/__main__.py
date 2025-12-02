import os
from dotenv import load_dotenv
from pathlib import Path
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_core.documents.base import Document
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages.ai import AIMessage
from langchain_core.tools.base import BaseTool
from langchain_core.tools.simple import Tool
from langchain_core.vectorstores.base import VectorStoreRetriever
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter

from sqlalchemy import create_engine, text
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent
from langchain_core.tools import tool
from langgraph.graph.state import CompiledStateGraph
# from app.config import settings
from langchain_classic.tools.retriever import create_retriever_tool
from langgraph.graph import MessagesState

# from api.app.config import settings

# ---- Inicializace prostředí – volat JEDNOU na začátku skriptu ----
load_dotenv()


# ---- Konfigurace (můžeš upravit nebo tahat z env) ----
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-large"
DEFAULT_COLLECTION_NAME = "my_docs"
DEFAULT_CONNECTION_URL: str = f"postgresql+psycopg://{os.getenv("DB__USER")}:{os.getenv("DB__PASSWORD")}@{os.getenv("DB__HOST")}:{os.getenv("DB__PORT")}/postgres"


# Pomocné funkce pro práci s Documenty a chunky
# ====================================================================


def make_chunk_id(doc: Document) -> str:
    """
    Vytvoří ID na základě názvu souboru a start_index.
    Příklad: 'A1_Co_je_prompt.md:0', 'A1_Co_je_prompt.md:500'
    """
    source = doc.metadata.get("source")
    if not source:
        raise ValueError("Document nemá metadata['source'], nelze vytvořit ID chunku.")

    start = doc.metadata.get("start_index")
    if start is None:
        # Pokud se přidává start_index ve splitteru, měl by vždy být.
        raise ValueError(
            "Document nemá metadata['start_index'], nelze vytvořit ID chunku."
        )

    return f"{Path(source).name}:{start}"


def load_folder(
    folder_path: str,
    file_extension: str = ".md",
) -> tuple[list[Document], list[str]]:
    """
    Načte všechny soubory s danou příponou ze složky
    a vrátí je jako seznam Documentů + názvy souborů.
    """
    folder = Path(folder_path)
    if not folder.exists():
        raise FileNotFoundError(f"Složka '{folder}' neexistuje.")

    all_docs: list[Document] = []
    filenames: list[str] = []

    for file_path in folder.glob(f"*{file_extension}"):
        loader = UnstructuredMarkdownLoader(str(file_path))
        docs: list[Document] = loader.load()
        all_docs.extend(docs)
        filenames.append(file_path.name)

    if not all_docs:
        print(
            f"Ve složce '{folder}' nebyly nalezeny žádné soubory s příponou '{file_extension}'."
        )

    return all_docs, filenames


def chunk_files(
    docs: list[Document],
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> tuple[list[Document], list[str]]:
    """
    Rozchunkuje všechny Documenty v `docs` a vrátí:
      - all_splits: seznam chunků (Document)
      - chunk_ids: seznam ID pro každý chunk
    """
    if not docs:
        print("Nebyl předán žádný dokument k chunkování.")
        return [], []

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True,
    )

    all_splits: list[Document] = text_splitter.split_documents(docs)
    chunk_ids: list[str] = [make_chunk_id(doc) for doc in all_splits]

    print(f"Split {len(docs)} documents into {len(all_splits)} chunks.")
    return all_splits, chunk_ids


# Embeddings + PGVector helpery
# ====================================================================


def create_embeddings(model_name: str = DEFAULT_EMBEDDING_MODEL) -> OpenAIEmbeddings:
    """Pomocná funkce pro vytvoření embeddings – snadno se reuseuje."""
    return OpenAIEmbeddings(model=model_name)


def create_pgvector_store(
    embeddings: OpenAIEmbeddings,
    collection_name: str = DEFAULT_COLLECTION_NAME,
    connection_url: str = DEFAULT_CONNECTION_URL,
) -> PGVector:
    """Vytvoří (nebo připojí se k) PGVector store."""
    return PGVector(
        embeddings=embeddings,
        collection_name=collection_name,
        connection=connection_url,
    )


def embed_chunks_to_pgvector(
    chunks: list[Document],
    chunk_ids: list[str],
    vector_store: PGVector,
) -> list[str]:
    """
    Uloží chunky do PGVector store (embeddingy se dopočítají uvnitř).
    Vrací:
      - stored_ids (IDs, které DB uložila)
    """
    if not chunks:
        print("Žádné chunky k uložení. embed_chunks_to_pgvector nic neudělal.")
        return []

    if len(chunks) != len(chunk_ids):
        raise ValueError(
            f"Počet chunků ({len(chunks)}) se neshoduje s počtem IDs ({len(chunk_ids)})."
        )

    stored_ids = vector_store.add_documents(
        documents=chunks,
        ids=chunk_ids,
    )

    print(f"Stored {len(stored_ids)} vectors.")
    if stored_ids:
        print("Sample stored IDs:", stored_ids[:5])

    return stored_ids


def load_pgvector_store(
    collection_name: str = DEFAULT_COLLECTION_NAME,
    connection_url: str = DEFAULT_CONNECTION_URL,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
) -> PGVector:
    """
    Načte existující PGVector kolekci z Postgresu (žádné nové vektory se nevkládají).
    """
    embeddings = create_embeddings(embedding_model)
    vector_store = create_pgvector_store(
        embeddings=embeddings,
        collection_name=collection_name,
        connection_url=connection_url,
    )
    return vector_store


# Kontrola existence kolekce + "get or create" logika
# ====================================================================


def collection_exists(
    collection_name: str,
    connection_url: str = DEFAULT_CONNECTION_URL,
) -> bool:
    """
    Ověří, zda v PGVector (Postgres) existuje kolekce s daným názvem.
    Využívá tabulku `langchain_pg_collection`, kterou používá LangChain PGVector.
    """

    engine = create_engine(connection_url)

    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM langchain_pg_collection
                    WHERE name = :name
                    LIMIT 1
                    """
                ),
                {"name": collection_name},
            )
            return result.scalar() is not None
    except Exception as e:
        # Pokud tabulka ještě neexistuje (čistá DB), bereme to jako "kolekce neexistuje"
        print(f"[collection_exists] Warning: {e}")
        return False


def get_or_create_vector_store_for_folder(
    folder_path: str,
    file_extension: str,
    collection_name: str,
    connection_url: str = DEFAULT_CONNECTION_URL,
    embedding_model: str = DEFAULT_EMBEDDING_MODEL,
) -> PGVector:
    """
    1) Zkontroluje, jestli v DB existuje kolekce `collection_name`.
    2a) Pokud ANO -> jen načte PGVector store a vrátí ho.
    2b) Pokud NE -> načte soubory ze složky, rozchunkuje je, embedne do PGVector
        a vrátí hotový store.
    """

    embeddings: OpenAIEmbeddings = create_embeddings(embedding_model)

    if collection_exists(collection_name, connection_url):
        print(f"Kolekce '{collection_name}' existuje – jen ji načítám.")
        vector_store: PGVector = create_pgvector_store(
            embeddings=embeddings,
            collection_name=collection_name,
            connection_url=connection_url,
        )
        return vector_store

    # --- Kolekce neexistuje: musíme ji vytvořit z dokumentů ---
    print(f"Kolekce '{collection_name}' neexistuje – indexuji složku '{folder_path}'.")

    # 1) načíst soubory
    docs, filenames = load_folder(folder_path, file_extension)

    if not docs:
        raise ValueError(
            f"Ve složce '{folder_path}' nebyly nalezeny žádné soubory s příponou '{file_extension}'."
        )

    # 2) rozchunkovat
    chunks, chunk_ids = chunk_files(docs)

    if not chunks:
        raise ValueError("Nepodařilo se vytvořit žádné chunky z načtených dokumentů.")

    # 3) vytvořit PGVector store
    vector_store = create_pgvector_store(
        embeddings=embeddings,
        collection_name=collection_name,
        connection_url=connection_url,
    )

    # 4) uložit embeddingy
    stored_ids = embed_chunks_to_pgvector(
        chunks=chunks,
        chunk_ids=chunk_ids,
        vector_store=vector_store,
    )
    print(f"Stored {len(stored_ids)} vectors do kolekce '{collection_name}'.")

    return vector_store


# ====================================================================


@tool(response_format="content_and_artifact")
def retrieve_context(query: str):
    """Retrieve information to help answer a query."""
    retrieved_docs = vector_store.similarity_search(query, k=2)
    serialized = "\n\n".join(
        (f"Source: {doc.metadata}\nContent: {doc.page_content}")
        for doc in retrieved_docs
    )
    return serialized, retrieved_docs


if __name__ == "__main__":
    COLLECTION_NAME = "kurz_promptovani_01"
    FOLDER_PATH = "../examples/kurz_promptovani_01"
    FILE_EXTENSION = ".md"
    CONNECTION_URL = DEFAULT_CONNECTION_URL

    vector_store: PGVector = get_or_create_vector_store_for_folder(
        folder_path=FOLDER_PATH,
        file_extension=FILE_EXTENSION,
        collection_name=COLLECTION_NAME,
        connection_url=CONNECTION_URL,
    )
    
    model: BaseChatModel = init_chat_model("gpt-4.1")

    tools: list[BaseTool] = [retrieve_context]

    prompt = (
        "You have access to a tool that retrieves context from a course. "
        "Use the tool to help answer user queries."
    )
    agent: CompiledStateGraph = create_agent(model, tools, system_prompt=prompt)

    query = "Co je to promptování a jaké jsou nejlepší praktiky pro tvorbu efektivních promptů? a mohl bys mi připravit otazky na procvičení?"

    for event in agent.stream(
        {"messages": [{"role": "user", "content": query}]},
        stream_mode="values",
    ):
        event["messages"][-1].pretty_print()
    
    # retriever: VectorStoreRetriever = vector_store.as_retriever()

    # retriever_tool: Tool = create_retriever_tool(
    #     retriever,
    #     "retrieve_course",
    #     "Search and return information about Crouse about prompting",
    # )
    
    # response_model: BaseChatModel = init_chat_model("gpt-4o", temperature=0)
    
    # def generate_query_or_respond(state: MessagesState):
    #     """Call the model to generate a response based on the current state. Given
    #     the question, it will decide to retrieve using the retriever tool, or simply respond to the user.
    #     """
    #     response: AIMessage = (
    #         response_model
    #         .bind_tools([retriever_tool]).invoke(state["messages"])  
    #     )
    #     return {"messages": [response]}

    # input = {
    #     "messages": [
    #         {
    #             "role": "user",
    #             "content": "O čem je tento kurz",
    #         }
    #     ]
    # }
    # print(generate_query_or_respond(input)["messages"][-1].pretty_print())