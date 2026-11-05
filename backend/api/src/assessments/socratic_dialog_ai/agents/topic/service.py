from dataclasses import dataclass

from sqlalchemy.orm import Session

from api.src.assessments.socratic_dialog_ai.agents.topic.graph import create_graph


@dataclass
class GeneratedTopic:
    topic: str
    question: str


class SocraticTopicGenerator:
    """Z learn blocků modulu (bez module_id celého kurzu) vymyslí téma
    sokratovského dialogu a první otázku."""

    def __init__(self, db: Session, course_id: int, module_id: int | None):
        self.db = db
        self.course_id = course_id
        self.module_id = module_id

    async def generate(self) -> GeneratedTopic:
        result = await create_graph().ainvoke(
            {"db": self.db, "course_id": self.course_id, "module_id": self.module_id}
        )

        error = result.get("error")
        if error:
            raise ValueError(error)

        return GeneratedTopic(topic=result["topic"], question=result["question"])
