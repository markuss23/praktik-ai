"""Node pro synchronizaci GitHub wiki repozitáře na lokální disk."""

import subprocess
from pathlib import Path

from api.config import settings

from agents.wiki.agent.state import WikiAgentState


def clone_or_pull_wiki(repo_url: str, local_path: str) -> Path:
    """
    Zajistí, že lokální adresář obsahuje aktuální obsah GitHub wiki repozitáře.

    Pokud adresář ještě neobsahuje git repozitář, provede git clone.
    Pokud už existuje, provede git pull, aby stáhl jen nové změny.

    """
    path = Path(local_path)
    git_dir = path / ".git"

    if git_dir.exists():
        print(f"Repozitář už existuje v {path}, dělám git pull...")
        subprocess.run(
            ["git", "pull"],
            cwd=path,
            check=True,
            capture_output=True,
            text=True,
        )
    else:
        print(f"Klonuji {repo_url} do {path}...")
        path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["git", "clone", repo_url, str(path)],
            check=True,
            capture_output=True,
            text=True,
        )

    return path


def clone_or_pull_wiki_node(state: WikiAgentState) -> WikiAgentState:
    """
    Naklonuje nebo aktualizuje lokální kopii GitHub wiki repozitáře.
    """
    repo_url = state["repo_url"]
    local_path = state["local_path"]

    print(f"Synchronizuji wiki {repo_url} -> {local_path}...")
    clone_or_pull_wiki(repo_url, local_path)

    return state


if __name__ == "__main__":
    # Ruční test: spusť "python -m agents.wiki.agent.nodes.clone_or_pull_wiki" z backend/ složky.
    test_repo_url = settings.wiki.repo_url
    test_local_path = settings.wiki.local_path

    result_path = clone_or_pull_wiki(test_repo_url, test_local_path)

    md_files = list(result_path.glob("*.md"))
    print(f"\nHotovo. Nalezeno {len(md_files)} .md souboru v {result_path}:")
    for md_file in md_files:
        safe_name = md_file.name.encode("ascii", "replace").decode("ascii")
        print(f"  - {safe_name}")
