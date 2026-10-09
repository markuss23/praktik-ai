import time

from agents.base.llm import get_llm_config
from agents.image_generator.clients import generate_image_openai
from agents.image_generator.state import GeneratedImageResult, ImageGeneratorState

# Klíč v system_setting, jehož sloupec model určuje OpenAI image model
IMAGE_MODEL_SETTING_KEY = "image_generator_model"
DEFAULT_IMAGE_MODEL = "gpt-image-2"


def get_image_model(db) -> str:
    """Vrátí název image modelu z system_setting.

    Pokud záznam v DB chybí, použije se DEFAULT_IMAGE_MODEL.

    """
    cfg = get_llm_config(
        db,
        IMAGE_MODEL_SETTING_KEY,
        default_model=DEFAULT_IMAGE_MODEL,
        default_prompt="",
    )
    return cfg.model


async def generate_image_node(state: ImageGeneratorState) -> ImageGeneratorState:
    """Node pro vygenerování obrázku image modelem nastaveným v databázi."""
    db = state["db"]
    image_prompt: str = state["image_prompt"]
    model_name = get_image_model(db)

    if not (model_name.startswith("gpt-image") or model_name == "chatgpt-image-latest"):
        raise ValueError(
            f"Image model '{model_name}' není podporován "
            "(jen gpt-image-* a chatgpt-image-latest); uprav system_setting "
            f"'{IMAGE_MODEL_SETTING_KEY}'"
        )

    print(f"Generuji obrázek modelem {model_name}")
    start = time.perf_counter()

    image_url = await generate_image_openai(model_name, image_prompt)

    latency_ms = int((time.perf_counter() - start) * 1000)
    print(f"{model_name} hotovo za {latency_ms} ms")

    state["result"] = GeneratedImageResult(
        model_name=model_name, image_url=image_url, latency_ms=latency_ms
    )
    return state
