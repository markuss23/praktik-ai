from pathlib import Path

from agents.base.loaders.base import file_to_text
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

    content_parts: list = []

    for remote_path in course_input.files:
        filename = Path(remote_path).name
        try:
            content_bytes = seaweedfs.download_file(remote_path)
            data = file_to_text(content_bytes, filename)
            content_parts.append(f"--- {filename} ---\n{data}")
            print(f"   -> Načten soubor: {filename}")
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
