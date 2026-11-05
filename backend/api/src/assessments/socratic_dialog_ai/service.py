from sqlalchemy.orm import Session

from api.src.assessments.outcome import AnswerOutcome
from api.src.assessments.socratic_dialog_ai.agents.dialog.service import (
    SocraticDialogAsker,
)
from api.src.assessments.socratic_dialog_ai.agents.summary.service import summarize
from api.src.assessments.socratic_dialog_ai.agents.topic.service import (
    SocraticTopicGenerator,
)
from api.src.assessments.socratic_dialog_ai.schemas import (
    SocraticDialogAIState,
    SocraticDialogAITurn,
    SocraticDialogAIView,
)


async def initial_state(
    db: Session, user, course_assessment, cfg
) -> SocraticDialogAIState:
    """Načte učební text (modul, u course_final celý kurz), AI z něj vymyslí
    téma a první otázku. State: topic, turns=[první otázka], elo=cfg.start_elo."""
    generated = await SocraticTopicGenerator(
        db, course_assessment.course_id, course_assessment.module_id
    ).generate()

    return SocraticDialogAIState(
        topic=generated.topic,
        turns=[SocraticDialogAITurn(role="assistant", content=generated.question)],
        elo=cfg.start_elo,
    )


def view(cfg, state) -> SocraticDialogAIView:
    """Vrátí poslední otázku AI z state.turns."""
    question = next(t.content for t in reversed(state.turns) if t.role == "assistant")
    return SocraticDialogAIView(question=question)


async def evaluate_answer(db, course_assessment, cfg, state, answer) -> AnswerOutcome:
    """Přidá tah studenta, AI vrátí delta elo + další otázku nebo KONEC.
    Konec (max_turns, nebo KONEC po min_turns) -> AI shrnutí do feedback,
    score z elo, is_passed = elo >= cfg.pass_elo. Bez verdiktu v průběhu."""
    turns = [*state.turns, SocraticDialogAITurn(role="student", content=answer)]
    student_turns = sum(t.role == "student" for t in turns)
    must_end = student_turns >= cfg.max_turns

    step = await SocraticDialogAsker(
        db, course_assessment.course_id, course_assessment.module_id
    ).ask(
        topic=state.topic,
        turns=[t.model_dump() for t in turns],
        max_step=cfg.max_step,
        can_end=student_turns >= cfg.min_turns,
        must_end=must_end,
    )

    # AI navrhuje, meze hlídá kód
    delta = max(-cfg.max_step, min(cfg.max_step, step.delta))
    turns[-1].delta = delta
    elo = max(cfg.min_elo, min(cfg.max_elo, state.elo + delta))
    new_state = state.model_copy(
        update={"turns": turns, "elo": elo, "last_answer": answer}
    )

    finished = must_end or (step.question is None and student_turns >= cfg.min_turns)
    if not finished:
        # ponytail: KONEC před min_turns -> obecná otázka; lepší by byl retry AI
        question = step.question or "Můžeš svou myšlenku rozvést víc?"
        new_state.turns.append(SocraticDialogAITurn(role="assistant", content=question))
        # Bez verdiktu v průběhu — is_correct nic neznamená
        return AnswerOutcome(state=new_state, is_correct=True, finished=False)

    summary = await summarize(db, state.topic, [t.model_dump() for t in turns])
    new_state.summary = summary
    is_passed = elo >= cfg.pass_elo
    return AnswerOutcome(
        state=new_state,
        is_correct=is_passed,
        finished=True,
        score=(elo - cfg.min_elo) / (cfg.max_elo - cfg.min_elo) * 100,
        is_passed=is_passed,
        feedback=summary,
    )
