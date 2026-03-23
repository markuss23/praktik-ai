from sqlalchemy import select
from sqlalchemy.orm import Session

from api import models
from api.enums import ModuleTaskSessionStatus
from agents.assessment_generator.state import AssessmentState


def persist_session(state: AssessmentState) -> dict:
    """Uloží nebo aktualizuje ModuleTaskSession s vygenerovanou otázkou."""
    print("Ukládám session do DB...")

    # Pokud předchozí uzel nastavil chybu, přeskočíme
    if state.get("error"):
        return {}

    db: Session = state["db"]
    user_id: int = state["user_id"]
    module_id: int = state["module_id"]
    generated_question: str = state["generated_question"]

    # Hledáme existující aktivní session pro daného uživatele a modul
    existing_session: models.ModuleTaskSession | None = (
        db.execute(
            select(models.ModuleTaskSession).where(
                models.ModuleTaskSession.user_id == user_id,
                models.ModuleTaskSession.module_id == module_id,
                models.ModuleTaskSession.is_active.is_(True),
                models.ModuleTaskSession.status == ModuleTaskSessionStatus.in_progress,
            )
        )
        .scalars()
        .first()
    )

    if existing_session is not None:
        # Aktualizuj generated_task (přegenerování otázky pro nový pokus)
        print(f"Aktualizuji existující session {existing_session.session_id}")
        existing_session.generated_task = generated_question
        db.commit()
        db.refresh(existing_session)
        return {"session_id": existing_session.session_id}

    # Vytvoř nový záznam
    new_session = models.ModuleTaskSession(
        user_id=user_id,
        module_id=module_id,
        status=ModuleTaskSessionStatus.in_progress,
        generated_task=generated_question,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    print(f"Vytvořena nová session {new_session.session_id}")
    return {"session_id": new_session.session_id}
