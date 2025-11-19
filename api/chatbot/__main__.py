from dotenv import load_dotenv
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_core.documents.base import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore

loader = UnstructuredMarkdownLoader(
    "/home/marek/projects/marek/github/praktik-ai/examples/kurz_promptovani_01/A1_Co_je_prompt.md"
)
docs: list[Document] = loader.load()


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50, add_start_index=True
)
all_splits: list[Document] = text_splitter.split_documents(docs)

print(len(all_splits))
print(all_splits[1])

load_dotenv()


embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

vector_1 = embeddings.embed_query(all_splits[0].page_content)
vector_2 = embeddings.embed_query(all_splits[1].page_content)

assert len(vector_1) == len(vector_2)
print(f"Generated vectors of length {len(vector_1)}\n")
print(vector_1[:10])

vector_store = InMemoryVectorStore(embeddings)

ids = vector_store.add_documents(documents=all_splits)

results = vector_store.similarity_search_with_score(
    "Co je to promptovani?"
)

print("-------------")
doc, score = results[0]
print(f"Score: {score}\n")
print(doc.page_content)