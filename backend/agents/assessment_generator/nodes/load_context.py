from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api import models
from agents.assessment_generator.state import AssessmentState


def load_context(state: AssessmentState) -> dict:
    """Načte modul a jeho learn block, předá learn_content do stavu."""
    print("Načítám kontext modulu...")

    db: Session = state["db"]
    module_id: int = state["module_id"]

    module: models.Module | None = (
        db.execute(
            select(models.Module)
            .options(joinedload(models.Module.learn_blocks))
            .where(
                models.Module.module_id == module_id,
                models.Module.is_active.is_(True),
            )
        )
        .unique()
        .scalars()
        .first()
    )

    if module is None:
        print(f"Modul {module_id} nenalezen")
        return {"error": "Modul nenalezen"}

    # Aktivní learn blocky jsou již filtrovány přes relationship primaryjoin
    learn_blocks = module.learn_blocks
    if not learn_blocks:
        print(f"Modul {module_id} nemá žádný learn block")
        return {"error": "Modul nemá žádný learn block"}

    # Modul má max 1 aktivní learn block (unikátní index), použijeme první
    learn_content = learn_blocks[0].content
    print(f"Learn block načten ({len(learn_content)} znaků)")

    return {"learn_content": learn_content}
