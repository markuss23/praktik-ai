"""Node pro načtení obsahu wiki stránek z lokálního disku."""

from pathlib import Path

from agents.base.loaders.markdown import MarkdownLoader
from agents.wiki.agent.state import WikiAgentState, WikiPageData


def load_pages_node(state: WikiAgentState) -> WikiAgentState:
    """
    Načte všechny .md soubory z naklonované wiki do state.

    """
    local_path = state["local_path"]
    loader = MarkdownLoader()

    md_files = list(Path(local_path).glob("*.md"))
    print(f"Nacitam {len(md_files)} wiki stranek z {local_path}...")

    pages: list[WikiPageData] = [
        WikiPageData(
            title=md_file.stem,
            file_path=str(md_file),
            content=loader.load(str(md_file)),
        )
        for md_file in md_files
    ]

    return {
        **state,
        "pages": pages,
    }
