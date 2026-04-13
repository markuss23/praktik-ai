from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.embedding_generator.graph import create_graph


@dataclass
class EmbeddingGenerationResult:
    course_id: int
    blocks_processed: int
    chunks_created: int


class EmbeddingGeneratorService:
    """Service pro generování embeddingů pomocí LangGraph."""

    def __init__(self, db: Session, course_id: int):
        self.db = db
        self.course_id = course_id

    async def generate(self) -> EmbeddingGenerationResult:
        """Sestaví a spustí graf, vrátí statistiky generování."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "course_id": self.course_id,
                "db": self.db,
            }
        )

        return EmbeddingGenerationResult(
            course_id=result["course_id"],
            blocks_processed=result.get("blocks_processed", 0),
            chunks_created=result.get("chunks_created", 0),
        )
