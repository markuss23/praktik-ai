from pathlib import Path

from agents.base.loaders.base import DataLoader
from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput


def load_data_node(state: AgentState) -> AgentState:
    """Node pro načtení obsahu souborů z cest."""
    print("Načítám obsah souborů...")

    course_input: CourseInput | None = state.get("course_input")
    if course_input is None:
        raise ValueError("course_input is not available in state")

    loader = DataLoader()
    content_parts: list = []

    for file_path in course_input.files:
        try:
            data: str = loader.load(file_path)
            content_parts.append(f"--- {Path(file_path).name} ---\n{data}")
            print(f"   -> Načten soubor: {Path(file_path).name}")
        except FileNotFoundError as e:
            print(f"   -> {e}")

    state["source_content"] = "\n\n".join(content_parts)
    print(f"   -> Celkem načteno {len(content_parts)} souborů")

    return state
