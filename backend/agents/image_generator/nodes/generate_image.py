import time

from agents.image_generator.clients import generate_image_openai
from agents.image_generator.state import GeneratedImageResult, ImageGeneratorState


async def generate_image_node(state: ImageGeneratorState) -> dict:
    """Node pro vygenerování obrázku jedním konkrétním OpenAI modelem (gpt-image-*).

    Spouští se paralelně - jednou pro každý model z models"""
    model_name: str = state["model_name"]
    image_prompt: str = state["image_prompt"]

    print(f"Generuji obrázek modelem {model_name}")
    start = time.perf_counter()

    try:
        if not (
            model_name.startswith("gpt-image") or model_name == "chatgpt-image-latest"
        ):
            raise NotImplementedError(
                f"Model '{model_name}' není podporován (jen gpt-image-* a chatgpt-image-latest)"
            )

        image_url = await generate_image_openai(model_name, image_prompt)

        latency_ms = int((time.perf_counter() - start) * 1000)
        result = GeneratedImageResult(
            model_name=model_name, image_url=image_url, latency_ms=latency_ms
        )
        print(f"{model_name} hotovo za {latency_ms} ms")
    except Exception as e:
        latency_ms = int((time.perf_counter() - start) * 1000)
        result = GeneratedImageResult(
            model_name=model_name, error=str(e), latency_ms=latency_ms
        )
        print(f"{model_name} selhal: {e}")

    return {"results": [result]}
