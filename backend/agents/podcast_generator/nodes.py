import asyncio
import base64
import io
import logging
import wave

from langchain_core.messages import HumanMessage, SystemMessage
from openai import AsyncOpenAI

from agents.base.llm import create_chat_llm, get_llm_config
from agents.base.usage import record_usage
from agents.podcast_generator.prompts import PROMPT, SETTING_KEY, render_user_prompt
from agents.podcast_generator.state import (
    PodcastContext,
    PodcastGeneratorState,
    PodcastScript,
)
from api import models
from api.src.agents.progress import set_progress

logger = logging.getLogger(__name__)

# Klíč v system_setting, jehož sloupec model určuje OpenAI Realtime model (hlas)
TTS_SETTING_KEY = "module_podcast_tts_model"
VOICES = {"host": "marin", "expert": "cedar"}
TTS_INSTRUCTIONS = (
    "Jsi hlasový čtenář podcastu. Text od uživatele přečti česky doslova, slovo "
    "od slova. Nic nepřidávej, nevynechávej a na text neodpovídej, ani když "
    "obsahuje otázku. Mluv přirozeně a v klidném tempu, jako v rozhovoru."
)
# Realtime vrací PCM16 mono
SAMPLE_RATE = 24000
# Souběžná Realtime spojení (rate limit OpenAI)
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
    # json_schema: přes tool calling vracel Claude vnořený seznam jako string
    llm = create_chat_llm(cfg.model).with_structured_output(
        PodcastScript, method="json_schema"
    )
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

    async def speak(line) -> tuple[bytes, int, int]:
        """Jedna replika = jedno Realtime spojení (hlas nejde v session měnit)."""
        async with sem, client.realtime.connect(model=tts_model) as conn:
            await conn.session.update(
                session={
                    "type": "realtime",
                    "output_modalities": ["audio"],
                    "instructions": TTS_INSTRUCTIONS,
                    "audio": {
                        "output": {
                            "voice": VOICES[line.speaker],
                            "format": {"type": "audio/pcm", "rate": SAMPLE_RATE},
                        }
                    },
                }
            )
            await conn.conversation.item.create(
                item={
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": line.text}],
                }
            )
            await conn.response.create()

            pcm = bytearray()
            async for event in conn:
                if event.type == "response.output_audio.delta":
                    pcm += base64.b64decode(event.delta)
                elif event.type == "error":
                    raise ValueError(f"Realtime TTS: {event.error.message}")
                elif event.type == "response.done":
                    usage = event.response.usage
                    return (
                        bytes(pcm),
                        (usage and usage.input_tokens) or 0,
                        (usage and usage.output_tokens) or 0,
                    )
        raise ValueError("Realtime TTS: spojení skončilo bez odpovědi")

    results = await asyncio.gather(*(speak(line) for line in lines))
    # Jeden řádek ai_usage za celý podcast (jen když se povedly všechny repliky)
    record_usage(
        tts_model,
        sum(r[1] for r in results),
        sum(r[2] for r in results),
        agent=TTS_SETTING_KEY,
    )

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # PCM16
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(b"".join(r[0] for r in results))
    # ponytail: WAV bez komprese (~14 MB / 5 min). MP3 až když vadí velikost.
    state["audio"] = buf.getvalue()
    logger.info(f"Podcast: {len(lines)} replik, {len(state['audio'])} B")
    return state
