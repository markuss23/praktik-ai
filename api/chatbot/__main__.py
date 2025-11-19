from dotenv import load_dotenv
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_core.documents.base import Document
from langchain_core.vectorstores.base import VectorStoreRetriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

loader = UnstructuredMarkdownLoader(
    "/home/marek/projects/marek/github/praktik-ai/examples/kurz_promptovani_01/A1_Co_je_prompt.md"
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
            "Jsi lektor kurzu promptování. Odpovídej česky, stručně a srozumitelně.\n\n"
            "Použij následující kontext z materiálů kurzu:\n\n{context}",
        ),
        ("human", "{question}"),
    ]
)
rag_chain = (
    {
        "context": retriever,
        "question": RunnablePassthrough(),
    }
    | prompt
    | llm
    | StrOutputParser()
)

question = "Co je to promptování?"
answer = rag_chain.invoke(question)
print(answer)