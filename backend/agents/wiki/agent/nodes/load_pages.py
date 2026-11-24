"""Node pro načtení obsahu wiki stránek a backend dokumentace z lokálního disku."""

import logging
from pathlib import Path

from agents.base.loaders.markdown import MarkdownLoader
from agents.wiki.agent.state import WikiAgentState, WikiPageData

logger = logging.getLogger(__name__)

# Kořen backendu (v kontejneru /code) — load_pages.py je v agents/wiki/agent/nodes/
BACKEND_ROOT = Path(__file__).resolve().parents[4]

# Interní dokumentace modulů backendu. Záměrně jen README.md — prompty agentů
# (prompt.md) ani jiné soubory se neindexují, protože wiki chat je veřejný.
BACKEND_DOCS_DIR = BACKEND_ROOT / "api" / "src"
BACKEND_DOCS_PATTERN = "README.md"


def load_wiki_pages(local_path: str, loader: MarkdownLoader) -> list[WikiPageData]:
    """
    Načte všechny .md stránky z naklonované GitHub wiki.
    """
    md_files = sorted(Path(local_path).glob("*.md"))
    logger.info(f"Nacitam {len(md_files)} wiki stranek z {local_path}...")

    return [
        WikiPageData(
            title=md_file.stem,
            file_path=str(md_file),
            content=loader.load(str(md_file)),
            source="wiki",
        )
        for md_file in md_files
    ]


def load_backend_docs(
    docs_dir: Path, backend_root: Path, loader: MarkdownLoader
) -> list[WikiPageData]:
    """
    Načte README.md všech modulů backendu jako interní kontext pro mentora.
    """
    if not docs_dir.is_dir():
        logger.warning(f"Adresar s backend dokumentaci {docs_dir} neexistuje")
        return []

    md_files = sorted(docs_dir.rglob(BACKEND_DOCS_PATTERN))
    logger.info(f"Nacitam {len(md_files)} README souboru backendu z {docs_dir}...")

    return [
        WikiPageData(
            title=md_file.relative_to(backend_root).as_posix(),
            file_path=str(md_file),
            content=loader.load(str(md_file)),
            source="backend_docs",
        )
        for md_file in md_files
    ]


def load_pages_node(state: WikiAgentState) -> WikiAgentState:
    """
    Načte wiki stránky a README moduly backendu do state.
    """
    loader = MarkdownLoader()

    pages = load_wiki_pages(state["local_path"], loader)
    pages += load_backend_docs(BACKEND_DOCS_DIR, BACKEND_ROOT, loader)

    return {
        **state,
        "pages": pages,
    }
