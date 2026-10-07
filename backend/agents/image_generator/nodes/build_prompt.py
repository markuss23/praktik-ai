from collections.abc import Callable

from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import create_chat_llm, get_llm_config
from agents.image_generator.prompt_template import render_image_prompt
from agents.image_generator.state import ImageContext, ImageGeneratorState, ImageSpec

DEFAULT_MODEL = "claude-sonnet-5"

# Node vracející aktualizovaný state (stejná signatura jako ostatní nody grafu).
BuildPromptNode = Callable[[ImageGeneratorState], ImageGeneratorState]


def make_build_prompt_node(
    *,
    setting_key: str,
    default_prompt: str,
    render_user_prompt: Callable[[ImageContext], str],
    label: str,
) -> BuildPromptNode:
    """Vytvoří node pro sestavení image promptu: LLM vybere ImageSpec, kód ho dosadí do šablony.

    Společná logika (načtení LLM konfigurace, structured output, render šablony) je tady;
    konkrétní agent dodá jen klíč nastavení, výchozí systémový prompt a formát user promptu.

    Args:
        setting_key: Klíč v tabulce system_setting (model + systémový prompt).
        default_prompt: Výchozí systémový prompt, pokud nastavení v DB chybí.
        render_user_prompt: Funkce, která z načteného kontextu (CourseContext / ModuleContext)
            vytvoří text user zprávy pro LLM.
        label: Krátký popis kontextu do logů, např. "kurzu" nebo "modulu".
    """

    def build_prompt_node(state: ImageGeneratorState) -> ImageGeneratorState:
        print(f"Sestavuji specifikaci obrázku z kontextu {label}...")

        context: ImageContext | None = state.get("context")
        db = state["db"]

        if context is None:
            raise ValueError("context is not available in state")

        cfg = get_llm_config(
            db,
            setting_key,
            default_model=DEFAULT_MODEL,
            default_prompt=default_prompt,
        )
        llm = create_chat_llm(cfg.model).with_structured_output(ImageSpec)

        messages = [
            SystemMessage(content=cfg.prompt),
            HumanMessage(content=render_user_prompt(context)),
        ]

        image_spec: ImageSpec = llm.invoke(messages)

        state["image_spec"] = image_spec
        state["image_prompt"] = render_image_prompt(image_spec)

        print(f"Image spec: {image_spec.model_dump()}")
        print(f"Image prompt:\n{state['image_prompt']}")

        return state

    return build_prompt_node
