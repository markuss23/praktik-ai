"""State pro wiki indexovacího agenta (sync z GitHub wiki do vector store)."""

from typing import Literal, TypedDict

from pydantic import BaseModel

# wiki = veřejná GitHub wiki, backend_docs = interní README moduly backendu
PageSource = Literal["wiki", "backend_docs"]


class WikiPageData(BaseModel):
    """
    Data pro jednu indexovanou stránku.
    """

    title: str
    file_path: str
    content: str
    source: PageSource = "wiki"


class WikiAgentState(TypedDict):
    """State pro wiki indexovacího agenta."""

    repo_url: str
    local_path: str
    pages: list[WikiPageData]
