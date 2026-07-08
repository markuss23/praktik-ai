from dataclasses import dataclass

from sqlalchemy.orm import Session

from agents.sql_agent.graph import create_graph


@dataclass
class SQLAgentResult:
    answer: str


class SQLAgentService:
    """Service pro RAG SQL agent chat pomocí LangGraph."""

    def __init__(self, db: Session, user_input: str):
        self.db: Session = db
        self.user_input = user_input

    async def chat(self) -> SQLAgentResult:
        """Sestaví a spustí graf, vrátí odpověď SQL agenta."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "user_input": self.user_input,
                "db": self.db,
            }
        )

        answer = result.get("answer", "Odpověď nebyla vygenerována")

        return SQLAgentResult(answer=answer)
