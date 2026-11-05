from dataclasses import dataclass

from sqlalchemy.orm import Session

from api.src.assessments.socratic_dialog_ai.agents.dialog.graph import create_graph


@dataclass
class DialogStep:
    # Návrh AI, ořez na max_step a rozsah elo dělá service formátu
    delta: int
    # None = AI rozhovor ukončila
    question: str | None


class SocraticDialogAsker:
    """Ohodnotí poslední odpověď studenta (delta elo) a položí další otázku."""

    def __init__(self, db: Session, course_id: int, module_id: int | None):
        self.db = db
        self.course_id = course_id
        self.module_id = module_id

    async def ask(
        self,
        topic: str,
        turns: list[dict],
        max_step: int,
        can_end: bool,
        must_end: bool,
    ) -> DialogStep:
        result = await create_graph().ainvoke(
            {
                "db": self.db,
                "course_id": self.course_id,
                "module_id": self.module_id,
                "topic": topic,
                "turns": turns,
                "max_step": max_step,
                "can_end": can_end,
                "must_end": must_end,
            }
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return DialogStep(delta=result["delta"], question=result["question"])
