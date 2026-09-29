from sqlalchemy import Update, select, update
from sqlalchemy.orm.session import Session

from agents.course_generator.state import AgentState, CourseGenerated
from api import models
from api.src.agents.progress import set_progress


def save_to_db_node(state: AgentState) -> AgentState:
    """Node pro uložení vygenerovaného kurzu do databáze."""
    print("Ukládání kurzu do databáze...")

    course_id: int = state.get("course_id")
    if course_id is not None:
        set_progress(course_id, step=5, label="Ukládání kurzu")
    db: Session = state.get("db")
    generated_course: CourseGenerated | None = state.get("course")
    summary: str = state.get("summarize_content")

    if course_id is None:
        raise ValueError("course_id is not available in state")

    if db is None:
        raise ValueError("db session is not available in state")

    if generated_course is None:
        raise ValueError("generated course is not available in state")

    # Označení kurzu jako vygenerovaný
    stmt: Update = (
        update(models.Course)
        .where(models.Course.course_id == course_id)
        .values(status="generated", summary=summary)
    )

    db.execute(stmt)

    # Uložení modulů
    for module in generated_course.modules:
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
                models.NeuroPrinciple.code == module.neuro_principle_code,
                models.NeuroPrinciple.is_active.is_(True),
            )
        )
        if principle_id is None:
            print(
                f"   -> WARN: Neznámý neuro_principle_code '{module.neuro_principle_code}' "
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
                    models.KrauuCompetence.code.in_(module.krauu_competence_codes),
                    models.KrauuCompetence.is_active.is_(True),
                    models.KrauuCompetence.parent_id.is_not(None),
                )
            ).all()
        )
        if not krauu_ids:
            print(
                f"   -> WARN: Modul '{module.title}' nemá platné KRAUU kompetence "
                f"({module.krauu_competence_codes}), nic nenapojeno"
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
                    models.BloomLevel.code.in_(module.bloom_level_codes),
                    models.BloomLevel.is_active.is_(True),
                )
            ).all()
        )
        if not bloom_ids:
            print(
                f"   -> WARN: Modul '{module.title}' nemá platné Bloomovy úrovně "
                f"({module.bloom_level_codes}), nic nenapojeno"
            )
        for bloom_id in bloom_ids:
            db.add(
                models.ModuleBloomLevel(
                    module_id=db_module.module_id, bloom_id=bloom_id
                )
            )

        # Uložení learn_block (max 1 na modul)
        if len(module.learn_blocks) > 1:
            raise ValueError(
                f"Modul '{module.title}' má {len(module.learn_blocks)} learn bloků, povolený je max 1."
            )
        for lb in module.learn_blocks:
            db_learn_block = models.LearnBlock(
                module_id=db_module.module_id,
                title=db_module.title,
                content=lb.content,
            )
            db.add(db_learn_block)

        # Uložení practice questions přímo do modulu
        for q in module.practice_questions:
            # Validace: closed otázky musí mít correct_answer, open musí mít example_answer
            if q.question_type.value == "closed" and not q.correct_answer:
                # Pokus odvodit correct_answer z první options pokud existují
                if q.closed_options:
                    q.correct_answer = q.closed_options[0].text
                    print(f"   -> WARN: Chybí correct_answer pro uzavřenou otázku, odvozeno z první option: {q.correct_answer[:50]}")
                else:
                    print(f"   -> WARN: Přeskakuji neplatnou uzavřenou otázku bez correct_answer a options: {q.question[:60]}")
                    continue
            if q.question_type.value == "open" and not q.example_answer:
                q.example_answer = "Bez příkladu odpovědi."
                print("   -> WARN: Chybí example_answer pro otevřenou otázku, nastaven fallback")

            db_question = models.PracticeQuestion(
                module_id=db_module.module_id,
                question_type=q.question_type.value,
                question=q.question,
                correct_answer=q.correct_answer if q.question_type.value == "closed" else None,
                example_answer=q.example_answer if q.question_type.value == "open" else None,
            )
            db.add(db_question)
            db.flush()  # Získání question_id před přidáním options/keywords

            if q.question_type.value == "closed":
                for opt in q.closed_options:
                    db_option = models.PracticeOption(
                        question_id=db_question.question_id,
                        text=opt.text,
                    )
                    db.add(db_option)
            elif q.question_type.value == "open":
                for kw in q.open_keywords:
                    db_keyword = models.QuestionKeyword(
                        question_id=db_question.question_id,
                        keyword=kw.keyword,
                    )
                    db.add(db_keyword)

    db.commit()

    print(f"   -> Kurz uložen do databáze (course_id: {course_id})")
    print(f"   -> Vytvořeno {len(generated_course.modules)} modulů")

    return state
