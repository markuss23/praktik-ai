from sqlalchemy import Update, select, update
from sqlalchemy.orm.session import Session

from agents.course_generator.state import (
    AgentState,
    CourseGenerated,
    ModuleEnrichment,
)
from api import models
from api.enums import QuestionType
from api.src.agents.progress import set_progress


def save_to_db_node(state: AgentState) -> AgentState:
    """Node pro uložení vygenerovaného kurzu do databáze."""
    print("Ukládání kurzu do databáze...")

    course_id: int = state.get("course_id")
    if course_id is not None:
        set_progress(course_id, step=5, label="Ukládání kurzu")
    db: Session = state.get("db")
    generated_course: CourseGenerated | None = state.get("course")
    enrichments: list[ModuleEnrichment] | None = state.get("enrichments")
    summary: str = state.get("summarize_content")

    if course_id is None:
        raise ValueError("course_id is not available in state")

    if db is None:
        raise ValueError("db session is not available in state")

    if generated_course is None:
        raise ValueError("generated course is not available in state")

    if enrichments is None:
        raise ValueError("enrichments are not available in state")

    # Označení kurzu jako vygenerovaný
    stmt: Update = (
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(status="generated", summary=summary)
    )

    db.execute(stmt)

    # Uložení modulů
    for module, enrichment in zip(generated_course.modules, enrichments, strict=True):
        db_module = models.Module(
            course_id=course_id,
            title=module.title,
            perex=module.perex,
            is_active=True,
        )
        db.add(db_module)
        db.flush()  # Získání module_id před přidáním learn_block a practices

        # Napojení neurovědního principu (LLM vrací kód, dohledáme principle_id)
        principle_id = db.scalar(
            select(models.NeuroPrinciple.principle_id).where(
                models.NeuroPrinciple.code == enrichment.neuro_principle_code,
                models.NeuroPrinciple.is_active.is_(True),
            )
        )
        if principle_id is None:
            print(
                f"   -> WARN: Neznámý neuro_principle_code '{enrichment.neuro_principle_code}' "
                f"pro modul '{module.title}', použit fallback NP-01"
            )
            principle_id = db.scalar(
                select(models.NeuroPrinciple.principle_id).where(
                    models.NeuroPrinciple.code == "NP-01",
                    models.NeuroPrinciple.is_active.is_(True),
                )
            )
        if principle_id is not None:
            db.add(
                models.ModuleNeuroPrinciple(
                    module_id=db_module.module_id,
                    principle_id=principle_id,
                )
            )

        # Napojení KRAUU kompetencí (LLM vrací kódy, dohledáme jen platné kompetence)
        krauu_ids = set(
            db.scalars(
                select(models.KrauuCompetence.krauu_id).where(
                    models.KrauuCompetence.code.in_(enrichment.krauu_competence_codes),
                    models.KrauuCompetence.is_active.is_(True),
                    models.KrauuCompetence.parent_id.is_not(None),
                )
            ).all()
        )
        if not krauu_ids:
            # Backend u modulu vyžaduje aspoň jednu kompetenci (jinak každá
            # úprava končí 422) — převezmeme kompetence kurzu, stejně jako to
            # dělá frontend u ručně založeného modulu.
            krauu_ids = set(
                db.scalars(
                    select(models.CourseKrauuCompetence.krauu_id).where(
                        models.CourseKrauuCompetence.course_id == course_id,
                        models.CourseKrauuCompetence.is_active.is_(True),
                    )
                ).all()
            )
            print(
                f"   -> WARN: Modul '{module.title}' nemá platné KRAUU kompetence "
                f"({enrichment.krauu_competence_codes}), použity kompetence kurzu"
            )
        for krauu_id in krauu_ids:
            db.add(
                models.ModuleKrauuCompetence(
                    module_id=db_module.module_id, krauu_id=krauu_id
                )
            )

        # Napojení úrovní Bloomovy taxonomie (LLM vrací kódy, dohledáme jen platné)
        bloom_ids = set(
            db.scalars(
                select(models.BloomLevel.bloom_id).where(
                    models.BloomLevel.code.in_(enrichment.bloom_level_codes),
                    models.BloomLevel.is_active.is_(True),
                )
            ).all()
        )
        if not bloom_ids:
            # Stejný fallback jako u KRAUU — Bloomovy úrovně kurzu.
            bloom_ids = set(
                db.scalars(
                    select(models.CourseBloomLevel.bloom_id).where(
                        models.CourseBloomLevel.course_id == course_id,
                        models.CourseBloomLevel.is_active.is_(True),
                    )
                ).all()
            )
            print(
                f"   -> WARN: Modul '{module.title}' nemá platné Bloomovy úrovně "
                f"({enrichment.bloom_level_codes}), použity úrovně kurzu"
            )
        for bloom_id in bloom_ids:
            db.add(
                models.ModuleBloomLevel(
                    module_id=db_module.module_id, bloom_id=bloom_id
                )
            )

        db.add(
            models.LearnBlock(
                module_id=db_module.module_id,
                title=db_module.title,
                content=module.content,
            )
        )

        # Otázky jsou zvalidované v enrich_modules (poměr 2 + 1 vynucuje schéma)
        for closed in (enrichment.closed_question_1, enrichment.closed_question_2):
            db_question = models.PracticeQuestion(
                module_id=db_module.module_id,
                question_type=QuestionType.closed.value,
                question=closed.question,
                correct_answer=closed.correct_answer,
            )
            db.add(db_question)
            db.flush()  # Získání question_id před přidáním options
            db.add_all(
                models.PracticeOption(question_id=db_question.question_id, text=text)
                for text in closed.options
            )

        db_question = models.PracticeQuestion(
            module_id=db_module.module_id,
            question_type=QuestionType.open.value,
            question=enrichment.open_question.question,
            example_answer=enrichment.open_question.example_answer,
        )
        db.add(db_question)
        db.flush()  # Získání question_id před přidáním keywords
        db.add_all(
            models.QuestionKeyword(question_id=db_question.question_id, keyword=keyword)
            for keyword in enrichment.open_question.keywords
        )

    db.commit()

    print(f"   -> Kurz uložen do databáze (course_id: {course_id})")
    print(f"   -> Vytvořeno {len(generated_course.modules)} modulů")

    return state
