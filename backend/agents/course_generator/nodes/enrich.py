import logging
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
from api.src.assessments.pretest.generator import (
    create_pretest_llm,
    generate_pretest,
)
from api.src.agents.progress import set_progress

logger = logging.getLogger(__name__)


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
    """Hotový obsah modulu, ke kterému se určují číselníky a otázky pretestu."""
    return (
        f"NÁZEV: {module.title}\n"
        f"PEREX: {module.perex}\n\n"
        f"VÝKLAD:\n{module.content}"
    )


def enrich_modules_node(state: AgentState) -> AgentState:
    """Node, který k hotovým modulům určí číselníky (NP, KRAUU, Bloom) a vytvoří pretest."""
    logger.info("Zařazování modulů do číselníků a tvorba otázek...")

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

    pretest_llm = create_pretest_llm(db)

    shared = f"{cfg.prompt}\n\n{build_input_block(course_input)}\n\n{build_catalogs(db)}"

    # Moduly i volání jsou nezávislé, zpracují se paralelně
    with ThreadPoolExecutor() as pool:
        enrichments = pool.map(
            lambda m: llm.invoke(f"{shared}\n\nMODUL:\n{build_module_block(m)}"),
            course.modules,
        )
        pretests = pool.map(
            lambda m: generate_pretest(pretest_llm, build_module_block(m), m.title),
            course.modules,
        )
        state["enrichments"] = list(enrichments)
        state["pretests"] = list(pretests)

    for module, e in zip(course.modules, state["enrichments"], strict=True):
        logger.info(
            f"   -> {module.title}: NP {e.neuro_principle_code}, "
            f"KRAUU {e.krauu_competence_codes}, Bloom {e.bloom_level_codes}"
        )

    return state
