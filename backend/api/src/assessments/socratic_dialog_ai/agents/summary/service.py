from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.orm import Session

from agents.base.llm import create_chat_llm, get_llm_config


PROMPT_KEY = "socratic_dialog_ai_summary"
PROMPT = (Path(__file__).parent / "prompt.md").read_text(encoding="utf-8")


# Jedno volání LLM bez kontextu z DB — graf by nic nepřidal
async def summarize(db: Session, topic: str, turns: list[dict]) -> str:
    cfg = get_llm_config(db, PROMPT_KEY)
    llm = create_chat_llm(cfg.model, temperature=None)

    transcript = "\n".join(
        f"{'TAZATEL' if t['role'] == 'assistant' else 'STUDENT'}: {t['content']}"
        for t in turns
    )
    response = await llm.ainvoke(
        [
            SystemMessage(content=PROMPT),
            HumanMessage(content=f"TÉMA: {topic}\n\nROZHOVOR:\n{transcript}"),
        ]
    )
    return response.text.strip()
