from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage


from api.src.assessments.open_question_ai.agents.generator.state import GeneratorState
from agents.base.llm import create_chat_llm, get_llm_config


PROMPT_KEY = "open_question_ai"
PROMPT = (Path(__file__).parent.parent / "prompt.md").read_text(encoding="utf-8")


def generate_question(state: GeneratorState):
    if state.get("error"):
        return {}

    learn_content: str = state["learn_content"]
    db = state["db"]

    prompt_key = PROMPT_KEY
    cfg = get_llm_config(db, prompt_key)
    llm = create_chat_llm(cfg.model, temperature=None)

    messages = [
        SystemMessage(content=PROMPT),
        HumanMessage(content=f"VÝUKOVÝ TEXT:\n{learn_content}"),
    ]

    response = llm.invoke(messages)
    raw = response.text.strip()

    return {
        "question": raw,
    }
