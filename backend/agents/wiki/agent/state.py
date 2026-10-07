"""State pro wiki indexovacího agenta (sync z GitHub wiki do vector store)."""

from typing import TypedDict

from pydantic import BaseModel


class WikiPageData(BaseModel):
    """Data pro wiki stránku."""

    title: str
    file_path: str
    content: str


class WikiAgentState(TypedDict):
    """State pro wiki indexovacího agenta."""

    repo_url: str
    local_path: str
    pages: list[WikiPageData]
