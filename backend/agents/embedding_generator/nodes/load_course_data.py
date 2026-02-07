"""Node pro načtení dat kurzu z databáze."""
from sqlalchemy import select

from agents.embedding_generator.state import AgentState, LearnBlockData
from api import models


def load_course_data_node(state: AgentState) -> AgentState:
    """Načte všechny learn blocky pro daný kurz."""
    course_id = state["course_id"]
    db = state["db"]
    
    print(f"Načítám learn blocky pro kurz {course_id}...")
    
    # Ověř že kurz existuje a má správný status
    course = db.execute(
        select(models.Course).where(
            models.Course.course_id == course_id,
            models.Course.is_active.is_(True)
        )
    ).scalar_one_or_none()
    
    if not course:
        raise ValueError(f"Kurz {course_id} nenalezen")
    
    # Kontrola statusu - embeddingy lze generovat pouze pro approved kurzy
    if course.status != models.Status.approved:
        raise ValueError(
            f"Embeddingy lze generovat pouze pro kurzy se statusem 'approved'. "
            f"Aktuální status kurzu: {course.status.value}"
        )
    
    # Načti všechny learn blocky kurzu
    learn_blocks_db = db.execute(
        select(models.LearnBlock)
        .join(models.Module)
        .where(
            models.Module.course_id == course_id,
            models.Module.is_active.is_(True),
            models.LearnBlock.is_active.is_(True)
        )
        .order_by(models.Module.position, models.LearnBlock.position)
    ).scalars().all()
    
    # Konverze na state data
    learn_blocks = [
        LearnBlockData(
            learn_id=lb.learn_id,
            module_id=lb.module_id,
            position=lb.position,
            content=lb.content
        )
        for lb in learn_blocks_db
    ]
    
    print(f" Nalezeno {len(learn_blocks)} learn blocků")
    
    return {
        **state,
        "learn_blocks": learn_blocks,
        "total_blocks": len(learn_blocks),
    }
