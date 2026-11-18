from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.orm import Session

from agents.base.llm import create_chat_llm, get_llm_config
from agents.mindmap_generator.schemas import MindMap
from api import models

# Model se čte z DB (system_setting, seed.py), prompt z prompt.md
SETTING_KEY = "module_mindmap"
PROMPT = (Path(__file__).parent / "prompt.md").read_text(encoding="utf-8")


async def generate_module_mindmap(db: Session, module: models.Module, content: str) -> MindMap:
    """Jedno LLM volání: z obsahu modulu vrátí strom myšlenkové mapy.

    ValueError (i ValidationError) = AI vrátila nepoužitelný výstup.
    """

    cfg = get_llm_config(db, SETTING_KEY)
    llm = create_chat_llm(cfg.model).with_structured_output(
        MindMap, method="json_schema"
    )
    mindmap: MindMap = await llm.ainvoke(
        [
            SystemMessage(content=PROMPT),
            HumanMessage(
                content=(
                    f"KURZ: {module.course.title}\n"
                    f"MODUL: {module.title}\n\n"
                    f"OBSAH MODULU:\n{content}"
                )
            ),
        ]
    )
    if not mindmap.branches:
        raise ValueError("AI vrátila prázdnou myšlenkovou mapu")
    return mindmap
