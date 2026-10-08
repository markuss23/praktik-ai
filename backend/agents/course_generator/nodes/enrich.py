from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.base.llm import get_llm_config, create_chat_llm
from agents.course_generator.input_block import build_input_block
from agents.course_generator.state import (
    AgentState,
    CourseGenerated,
    CourseInput,
    ModuleEnrichment,
    ModuleGenerated,
)
from api import models
from api.src.agents.progress import set_progress


def build_catalogs(db: Session) -> str:
    """Seznamy aktivních položek číselníků NP, KRAUU a Bloom pro prompt."""
    neuro = db.scalars(
        select(models.NeuroPrinciple)
        .where(models.NeuroPrinciple.is_active.is_(True))
        .order_by(models.NeuroPrinciple.code)
    ).all()
    krauu = db.scalars(
        select(models.KrauuCompetence)
        .where(models.KrauuCompetence.is_active.is_(True))
        .order_by(models.KrauuCompetence.code)
    ).all()
    bloom = db.scalars(
        select(models.BloomLevel)
        .where(models.BloomLevel.is_active.is_(True))
        .order_by(models.BloomLevel.code)
    ).all()

    neuro_lines = "\n".join(f"{p.code} {p.name} — {p.description}" for p in neuro)
    # Oblasti (bez rodiče) slouží jen jako nadpisy, vybírají se kompetence
    krauu_lines = "\n".join(
        f"{k.name}:" if k.parent_id is None else f"{k.code} {k.name} — {k.description}"
        for k in krauu
    )
    bloom_lines = "\n".join(f"{b.code} {b.name} — {b.description}" for b in bloom)

    return (
        f"SEZNAM NEUROVĚDNÍCH PRINCIPŮ:\n{neuro_lines}\n\n"
        f"SEZNAM KRAUU KOMPETENCÍ:\n{krauu_lines}\n\n"
        f"SEZNAM ÚROVNÍ BLOOMOVY TAXONOMIE:\n{bloom_lines}"
    )


def build_module_block(module: ModuleGenerated) -> str:
    """Hotový obsah modulu, ke kterému se určují číselníky a otázky."""
    return (
        f"NÁZEV: {module.title}\n"
        f"PEREX: {module.perex}\n\n"
        f"VÝKLAD:\n{module.content}"
    )


def validate_enrichment(enrichment: ModuleEnrichment) -> list[str]:
    """Vrátí chyby otázek, které schéma samo nevynutí.

    Platforma porovnává odpověď s textem možnosti doslova, proto
    correct_answer lišící se jen bílými znaky rovnou sjednotí s možností.
    """
    errors: list[str] = []

    for name in ("closed_question_1", "closed_question_2"):
        q = getattr(enrichment, name)
        if len(q.options) != 3:
            errors.append(f"{name}: má {len(q.options)} možností, musí mít přesně 3")
        if len({o.strip() for o in q.options}) != len(q.options):
            errors.append(f"{name}: možnosti se textově opakují")
        matches = [o for o in q.options if o.strip() == q.correct_answer.strip()]
        if matches:
            q.correct_answer = matches[0]
        else:
            errors.append(
                f"{name}: correct_answer „{q.correct_answer}“ není doslova shodný "
                "s textem žádné z možností"
            )

    open_q = enrichment.open_question
    if len(open_q.keywords) != 3:
        errors.append(
            f"open_question: má {len(open_q.keywords)} klíčových bodů, musí mít přesně 3"
        )
    if not open_q.example_answer.strip():
        errors.append("open_question: example_answer je prázdný")

    return errors


def enrich_module(llm, prompt: str, title: str) -> ModuleEnrichment:
    """Jedno volání LLM; při chybách otázek jeden opravný pokus s jejich výpisem."""
    enrichment: ModuleEnrichment = llm.invoke(prompt)
    errors = validate_enrichment(enrichment)
    if not errors:
        return enrichment

    print(f"   -> WARN: Modul '{title}' má chyby v otázkách, opakuji: {errors}")
    error_lines = "\n".join(f"- {e}" for e in errors)
    enrichment = llm.invoke(
        f"{prompt}\n\n"
        f"PŘEDCHOZÍ VÝSTUP:\n{enrichment.model_dump_json(indent=2)}\n\n"
        f"CHYBY V PŘEDCHOZÍM VÝSTUPU:\n{error_lines}\n\n"
        "Vrať celý výstup znovu a tyto chyby oprav."
    )
    errors = validate_enrichment(enrichment)
    if errors:
        raise ValueError(f"Modul '{title}' má i po opravě chyby v otázkách: {errors}")
    return enrichment


def enrich_modules_node(state: AgentState) -> AgentState:
    """Node, který k hotovým modulům určí číselníky (NP, KRAUU, Bloom) a vytvoří otázky."""
    print("Zařazování modulů do číselníků a tvorba otázek...")

    course_id = state.get("course_id")
    if course_id is not None:
        # ponytail: sdílí krok 4 s plánováním, frontend má pevný seznam 5 kroků
        set_progress(course_id, step=4, label="Číselníky a otázky modulů (AI)")

    course: CourseGenerated | None = state.get("course")
    course_input: CourseInput | None = state.get("course_input")
    db = state["db"]

    if course is None:
        raise ValueError("course is not available in state")

    if course_input is None:
        raise ValueError("course_input is not available in state")

    cfg = get_llm_config(db, "course_module_enricher")
    llm = create_chat_llm(cfg.model).with_structured_output(
        ModuleEnrichment, method="json_schema"
    )

    shared = f"{cfg.prompt}\n\n{build_input_block(course_input)}\n\n{build_catalogs(db)}"

    # Moduly jsou nezávislé, zpracují se paralelně
    with ThreadPoolExecutor() as pool:
        state["enrichments"] = list(
            pool.map(
                lambda m: enrich_module(
                    llm, f"{shared}\n\nMODUL:\n{build_module_block(m)}", m.title
                ),
                course.modules,
            )
        )

    for module, e in zip(course.modules, state["enrichments"], strict=True):
        print(
            f"   -> {module.title}: NP {e.neuro_principle_code}, "
            f"KRAUU {e.krauu_competence_codes}, Bloom {e.bloom_level_codes}"
        )

    return state
