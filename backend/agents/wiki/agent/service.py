from dataclasses import dataclass

from agents.wiki.agent.graph import create_graph

WIKI_REPO_URL = "https://github.com/markuss23/praktik-ai.wiki.git"
WIKI_LOCAL_PATH = "../wiki_data"


@dataclass
class WikiSyncResult:
    repo_url: str
    pages_processed: int


async def sync_wiki() -> "WikiSyncResult":
    """Naklonuje/aktualizuje projektovou GitHub wiki a znovu ji zaindexuje."""
    service = WikiAgentService(repo_url=WIKI_REPO_URL, local_path=WIKI_LOCAL_PATH)
    return await service.sync()


class WikiAgentService:
    """Service pro synchronizaci a indexování GitHub wiki pomocí LangGraph."""

    def __init__(self, repo_url: str, local_path: str):
        self.repo_url = repo_url
        self.local_path = local_path

    async def sync(self) -> WikiSyncResult:
        """Sestaví a spustí graf, vrátí statistiky synchronizace."""
        app = create_graph()

        result = await app.ainvoke(
            {
                "repo_url": self.repo_url,
                "local_path": self.local_path,
                "pages": [],
            }
        )

        return WikiSyncResult(
            repo_url=result["repo_url"],
            pages_processed=len(result.get("pages", [])),
        )
