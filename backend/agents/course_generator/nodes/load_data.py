import tempfile
from pathlib import Path

from agents.base.loaders.base import DataLoader
from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput
from api.src.agents.progress import set_progress
from api.storage import seaweedfs


def load_data_node(state: AgentState) -> AgentState:
    """Node pro načtení obsahu souborů ze SeaweedFS."""
    print("Načítám obsah souborů ze SeaweedFS...")

    set_progress(state["course_id"], step=2, label="Načítání podkladů")

    course_input: CourseInput | None = state.get("course_input")
    if course_input is None:
        raise ValueError("course_input is not available in state")

    loader = DataLoader()
    content_parts: list = []

    for remote_path in course_input.files:
        filename = Path(remote_path).name
        suffix = Path(remote_path).suffix
        try:
            # Stáhni soubor ze SeaweedFS do dočasného souboru
            content_bytes = seaweedfs.download_file(remote_path)
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(content_bytes)
                tmp_path = tmp.name
            try:
                data: str = loader.load(tmp_path)
                content_parts.append(f"--- {filename} ---\n{data}")
                print(f"   -> Načten soubor: {filename}")
            finally:
                Path(tmp_path).unlink(missing_ok=True)
        except Exception as e:
            print(f"   -> Chyba při načítání {filename}: {e}")

    if not content_parts:
        raise ValueError(
            f"Nepodařilo se načíst žádný soubor pro kurz '{course_input.title}'. "
            "Zkontroluj, zda jsou soubory správně nahrány."
        )

    state["source_content"] = "\n\n".join(content_parts)
    print(f"   -> Celkem načteno {len(content_parts)} souborů")

    return state
