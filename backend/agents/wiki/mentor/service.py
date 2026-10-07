from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.wiki.mentor.graph import create_graph


@dataclass
class WikiChatResult:
    answer: str


class WikiChatService:
    """Service pro RAG chat nad wiki obsahem pomocí LangGraph."""

    def __init__(self, db: Session, message: str):
        self.db = db
        self.message = message

    async def chat(self) -> WikiChatResult:
        """Sestaví a spustí graf, vrátí odpověď na otázku o wiki."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "db": self.db,
                "message": self.message,
            }
        )

        answer = result.get("answer", "Odpověď nebyla vygenerována")
        return WikiChatResult(answer=answer)
