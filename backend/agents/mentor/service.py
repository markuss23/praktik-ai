from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.mentor.graph import create_graph


@dataclass
class MentorResult:
    answer: str


class MentorService:
    """Service pro RAG mentor chat pomocí LangGraph."""

    def __init__(
        self,
        db: Session,
        learn_block_id: int,
        user_id: int,
        message: str,
        use_history: bool = True,
        scope: str = "module",
    ):
        self.db = db
        self.learn_block_id = learn_block_id
        self.user_id = user_id
        self.message = message
        self.use_history = use_history
        self.scope = scope

    async def chat(self) -> MentorResult:
        """Sestaví a spustí graf, vrátí odpověď mentora."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "learn_block_id": self.learn_block_id,
                "user_id": self.user_id,
                "message": self.message,
                "use_history": self.use_history,
                "scope": self.scope,
                "db": self.db,
            }
        )

        answer = result.get("answer", "Odpověď nebyla vygenerována")

        return MentorResult(answer=answer)
