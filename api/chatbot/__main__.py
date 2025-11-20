from operator import itemgetter
from dotenv import load_dotenv
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_core.documents.base import Document
from langchain_core.vectorstores.base import VectorStoreRetriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.runnables import RunnableLambda


loader = UnstructuredMarkdownLoader(
        "../examples/kurz_promptovani_01/A1_Co_je_prompt.md"
)
docs: list[Document] = loader.load()


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50, add_start_index=True
)
all_splits: list[Document] = text_splitter.split_documents(docs)


load_dotenv()


embeddings = OpenAIEmbeddings(model="text-embedding-3-large")


vector_store = InMemoryVectorStore(embeddings)

ids: list[str] = vector_store.add_documents(documents=all_splits)

retriever: VectorStoreRetriever = vector_store.as_retriever(search_kwargs={"k": 4})

llm = ChatOpenAI(model="gpt-4.1-mini")

prompt: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Jsi lektor kurzu promptování. Odpovídej česky, stručně a srozumitelně.",
        ),
        # sem bude RunnableWithMessageHistory sypat předchozí zprávy
        MessagesPlaceholder(variable_name="history"),
        ("system", "Použij následující kontext z materiálů kurzu:\n\n{context}"),
        ("human", "{question}"),
    ]
)


def format_docs(docs: list[Document]) -> str:
    return "\n\n".join(d.page_content for d in docs)


base_rag_chain = (
    {
        # z input dictu vezmeme "question", pošleme ji do retrieveru, pak do format_docs
        "context": itemgetter("question") | retriever | RunnableLambda(format_docs),
        "question": itemgetter("question"),
        # důležité: propustit history dál do promptu
        "history": itemgetter("history"),
    }
    | prompt
    | llm
    | StrOutputParser()
)


store = {}


def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


rag_with_history = RunnableWithMessageHistory(
    base_rag_chain,
    get_session_history=get_session_history,
    input_messages_key="question",  # klíč, kde je aktuální zpráva uživatele
    history_messages_key="history",  # klíč pro MessagesPlaceholder
)

config = {"configurable": {"session_id": "kurz_promptovani_01"}}

if __name__ == "__main__":
    print("Chat nad kurzem promptování (napiš 'exit' pro ukončení)\n")
    while True:
        user_input = input("Ty: ").strip()
        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit", "q"}:
            print("Konec")
            break

        answer = rag_with_history.invoke(
            {"question": user_input},
            config=config,
        )
        print(f"Bot: {answer}\n")
