import base64

import httpx
from openai import AsyncOpenAI

# Výpis možných modelů pro generování obrázků (OpenAI)
# gpt-image-2.5-sunburst, gpt-image-2.5-flare, gpt-image-2, gpt-image-1.5,
# gpt-image-1, gpt-image-1-mini, chatgpt-image-latest

# Nejširší landscape formát řady gpt-image (cover má poměr 590:226).
OPENAI_SIZE = "1536x1024"


async def generate_image_openai(model_name: str, prompt: str) -> str:
    """Vygeneruje obrázek přes OpenAI Images API a vrátí ho vždy jako data URI (base64 PNG).

    API vrací buď b64_json, nebo (u starších modelů) dočasnou URL - v tom případě
    se obrázek stáhne, aby byl výstup pro všechny modely jednotný.

    Args:
        model_name: OpenAI image model, např. "gpt-image-1".
        prompt: Finální image prompt.
    """
    client = AsyncOpenAI()
    # background="opaque": u line-art promptů model s "auto" často vrací průhledný PNG,
    # který se v prohlížečích jeví jako černé/tmavé pozadí.
    response = await client.images.generate(
        model=model_name,
        prompt=prompt,
        n=1,
        size=OPENAI_SIZE,
        background="opaque",
    )
    image = response.data[0]

    if image.b64_json:
        return f"data:image/png;base64,{image.b64_json}"

    async with httpx.AsyncClient() as http:
        downloaded = await http.get(image.url)
        downloaded.raise_for_status()

    return f"data:image/png;base64,{base64.b64encode(downloaded.content).decode()}"
