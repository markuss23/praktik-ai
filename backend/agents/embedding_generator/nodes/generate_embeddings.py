# """Node pro generování embeddingů."""
import logging
import re
from html.parser import HTMLParser

from langchain_core.documents.base import Document
from sqlalchemy import text
from langchain_text_splitters import RecursiveCharacterTextSplitter

from agents.vector_store import COLLECTION_NAME, get_vector_store
from agents.embedding_generator.state import AgentState
from agents.embedding_generator.state import LearnBlockData

logger = logging.getLogger(__name__)

# Blokové tagy oddělují odstavce — splitter pak řeže na prázdných řádcích, ne uprostřed věty
BLOCK_TAGS = {
    "p",
    "div",
    "br",
    "li",
    "ul",
    "ol",
    "blockquote",
    "table",
    "tr",
    "pre",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_endtag(self, tag):
        if tag in BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_data(self, data):
        # Zalomení řádků uvnitř HTML textu je jen mezera
        self.parts.append(re.sub(r"\s+", " ", data))


def html_to_text(html: str) -> str:
    """HTML obsahu bloku → prostý text s odstavci oddělenými prázdným řádkem (entity se převedou)."""
    parser = _TextExtractor()
    parser.feed(html)
    parser.close()
    text = re.sub(r" *\n *", "\n", "".join(parser.parts))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def generate_embeddings_node(state: AgentState) -> AgentState:
    learn_blocks: list[LearnBlockData] = state.get("learn_blocks", [])

    # Staré kusy kurzu pryč — jinak by zůstaly kusy smazaných a zkrácených bloků
    # ponytail: mazání a vkládání nejsou v jedné transakci; když generování spadne,
    # kurz zůstane bez embeddingů do dalšího spuštění
    db = state["db"]
    deleted = db.execute(
        text(
            "DELETE FROM langchain_pg_embedding e USING langchain_pg_collection c "
            "WHERE e.collection_id = c.uuid AND c.name = :collection "
            "AND e.cmetadata->>'course_id' = :course_id"
        ),
        {"collection": COLLECTION_NAME, "course_id": str(state["course_id"])},
    ).rowcount
    db.commit()
    logger.info(f"Smazáno {deleted} starých chunků kurzu {state['course_id']}")

    if not learn_blocks:
        logger.warning("Žádné learn blocky k zpracování")
        return state

    logger.info(f"Generuji embeddingy pro {len(learn_blocks)} learn blocků...")

    vector_store = get_vector_store()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # chunk size (characters)
        chunk_overlap=100,  # chunk overlap (characters)
        add_start_index=True,  # track index in original document
    )

    for learn_block in learn_blocks:
        logger.info(f"  • Learn block {learn_block.learn_id}: generuji embedding")

        texts: list[str] = text_splitter.split_text(html_to_text(learn_block.content))

        documents: list[Document] = [
            Document(
                page_content=text,
                metadata={
                    "learn_block_id": learn_block.learn_id,
                    "module_id": learn_block.module_id,
                    "course_id": state["course_id"],
                    "chunk_index": idx,
                },
            )
            for idx, text in enumerate(texts)
        ]

        logger.info(f"    → {len(documents)} chunků")

        vector_store.add_documents(
            documents,
            ids=[f"{learn_block.learn_id}_{idx}" for idx in range(len(documents))],
        )

    return state
