import asyncio
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from openai import AsyncOpenAI

from agents.base.llm import create_chat_llm, get_llm_config
from agents.podcast_generator.prompts import PROMPT, SETTING_KEY, render_user_prompt
from agents.podcast_generator.state import (
    PodcastContext,
    PodcastGeneratorState,
    PodcastScript,
)
from api import models
from api.src.agents.progress import set_progress

logger = logging.getLogger(__name__)

# Klíč v system_setting, jehož sloupec model určuje OpenAI TTS model
TTS_SETTING_KEY = "module_podcast_tts_model"
VOICES = {"host": "marin", "expert": "cedar"}
TTS_INSTRUCTIONS = "Mluv česky, přirozeně a v klidném tempu, jako v rozhovoru v podcastu."
# Souběžné TTS requesty (rate limit OpenAI)
TTS_CONCURRENCY = 5


def load_context_node(state: PodcastGeneratorState) -> PodcastGeneratorState:
    module = state["db"].get(models.Module, state["module_id"])
    if module is None:
        raise ValueError(f"Modul s id {state['module_id']} nebyl nalezen")

    learn_block = next(iter(module.learn_blocks), None)
    target = module.course.course_target
    state["context"] = PodcastContext(
        course_title=module.course.title,
        module_title=module.title,
        learn_block_content=learn_block.content if learn_block else None,
        target_name=target.name if target else None,
    )
    if not state["context"].learn_block_content:
        raise ValueError("Modul nemá obsah, podcast není z čeho vytvořit")
    return state


def write_script_node(state: PodcastGeneratorState) -> PodcastGeneratorState:
    set_progress(state.get("progress_key"), step=2, label="Psaní scénáře (AI)")

    cfg = get_llm_config(state["db"], SETTING_KEY)
    llm = create_chat_llm(cfg.model).with_structured_output(PodcastScript)
    script: PodcastScript = llm.invoke(
        [
            SystemMessage(content=PROMPT),
            HumanMessage(content=render_user_prompt(state["context"])),
        ]
    )
    if not script.lines:
        raise ValueError("AI vrátila prázdný scénář podcastu")

    state["script"] = script
    return state


async def synthesize_node(state: PodcastGeneratorState) -> PodcastGeneratorState:
    lines = state["script"].lines
    tts_model = get_llm_config(state["db"], TTS_SETTING_KEY).model
    set_progress(
        state.get("progress_key"), step=3, label=f"Převod na řeč ({tts_model})"
    )

    client = AsyncOpenAI()
    sem = asyncio.Semaphore(TTS_CONCURRENCY)

    async def speak(line) -> bytes:
        async with sem:
            response = await client.audio.speech.create(
                model=tts_model,
                voice=VOICES[line.speaker],
                input=line.text,
                instructions=TTS_INSTRUCTIONS,
                response_format="mp3",
            )
            return await response.aread()

    parts = await asyncio.gather(*(speak(line) for line in lines))
    # ponytail: MP3 se dá slepit prostým spojením framů; přehrávače to zvládnou,
    # jen délka v hlavičce může být nepřesná. Při problémech remux přes ffmpeg.
    state["audio"] = b"".join(parts)
    logger.info(f"Podcast: {len(lines)} replik, {len(state['audio'])} B")
    return state
