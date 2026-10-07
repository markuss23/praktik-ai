from sqlalchemy import select
from sqlalchemy.orm.session import Session

from agents.image_generator.module.state import ModuleContext, ModuleImageGeneratorState
from api import models


def load_module_context_node(
    state: ModuleImageGeneratorState,
) -> ModuleImageGeneratorState:
    """Node pro načtení kontextu modulu (title, obsah, číselníky kurzu) z databáze."""
    print("Načítám kontext modulu z databáze...")

    db: Session = state["db"]
    module_id: int = state["module_id"]

    module: models.Module | None = (
        db.execute(select(models.Module).where(models.Module.module_id == module_id))
        .scalars()
        .first()
    )

    if module is None:
        raise ValueError(f"Modul s id {module_id} nebyl nalezen")

    course = module.course
    block = course.course_block
    target = course.course_target
    subject = course.course_subject

    active_learn_block = next(iter(module.learn_blocks), None)

    state["context"] = ModuleContext(
        module_title=module.title,
        learn_block_content=active_learn_block.content if active_learn_block else None,
        course_title=course.title,
        subject_name=subject.name if subject else None,
        block_name=block.name if block else None,
        block_description=block.description if block else None,
        target_name=target.name if target else None,
        target_description=target.description if target else None,
    )

    print(f"Načten modul: {module.title}")

    return state
