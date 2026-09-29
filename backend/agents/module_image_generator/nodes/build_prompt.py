from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.module_image_generator.prompt_template import render_module_prompt
from agents.module_image_generator.state import (
    ModuleContext,
    ModuleImageGeneratorState,
    ModuleImageSpec,
)

DEFAULT_MODEL = "claude-sonnet-5"

DEFAULT_PROMPT = (
    "Navrhuješ ilustrační obrázek pro jeden modul vzdělávacího kurzu podle pevného "
    "designového systému. Styl je daný a neměníš ho: plochá ilustrace, jedna plná barva "
    "podkladu, bílá linková kresba, jeden barevný akcent. Ty rozhoduješ pouze o obsahu kresby.\n\n"
    "KÁNON:\n"
    "- Motiv je SCHÉMA, ne obrázek. Kreslí se mechanismus toho, co se v modulu učí, ne ikona "
    "tématu. Modul o Gitu nemá cover s logem Gitu, ale graf větví. Modul o AI nemá robota, "
    "ale síť s prosvícenou cestou.\n"
    "- Motiv vycházej primárně z OBSAHU MODULU (název + text), nikoli z celého kurzu - modul "
    "je jen jedna dílčí část kurzu a obrázek má odpovídat právě jí.\n"
    "- Kompozice zleva doprava: OBJEKT (jeden uzavřený tvar, ukotví oko) -> SCHÉMA (diagram, "
    "který nese sdělení).\n"
    "- Akcentem se zvýrazní přesně JEDNA věc: jedna cesta, jeden bod, jeden výsledek.\n"
    "- Tón podle oboru: purple = matematika a exaktní obory, green = AI, data, analytika, "
    "blue = vývoj, nástroje, verzování, rose a orange = ostatní obory. Příbuzné obory sdílí tón. "
    "Obor ber z kontextu kurzu (PŘEDMĚT / OBOR, BLOK), texty modulu jsou až druhotné.\n"
    "- Blok a cílová skupina určují úroveň abstrakce: pro začátečníky a mladší publikum jednodušší "
    "schéma s méně prvky, pro pokročilé může být diagram odbornější.\n"
    "- Motiv musí být poznatelný i při šířce 200 px - žádné drobné detaily.\n\n"
    "POSTUP:\n"
    "1. Napiš jednou anglickou větou, co se v modulu učí - mechanismus, ne název.\n"
    "2. Najdi schéma té věty: co bys nakreslil na tabuli? To je pravá část.\n"
    "3. Vyber objekt do levé části - nástroj nebo nosič tématu.\n"
    "4. Rozhodni, která jedna věc dostane akcent.\n"
    "5. Vyber tón podle oboru.\n\n"
    "PŘÍKLADY (objekt | schéma | akcent | tón):\n"
    "- Statistika a data: box plot | bar columns with a fitted curve | the tallest column | purple\n"
    "- Tabulky / Excel: grid of cells | formula flowing through an arrow into a result | the result cell | purple\n"
    "- Prompt engineering: three prompt pills | branching tree of answers | the chosen branch | green\n"
    "- Kyberbezpečnost: shield with a lock | stream of requests, one of them blocked | the blocked request | blue\n"
    "- Projektové řízení: board with columns | tasks flowing left to right | the finished task | orange\n"
    "- Jazyk / lingvistika: book with symbols | sentence parse tree | the root node | rose\n\n"
    "Všechna pole kromě tónu piš anglicky, stručně a vizuálně konkrétně. Méně je více: "
    "schéma má mít 3-6 prvků, žádná alternativy typu 'coin/tag' - vyber jednu věc."
)


def build_prompt_node(state: ModuleImageGeneratorState) -> ModuleImageGeneratorState:
    """Node pro sestavení image promptu: LLM vybere ModuleImageSpec, kód ho dosadí do pevné šablony."""
    print("Sestavuji specifikaci obrázku z kontextu modulu...")

    module_context: ModuleContext | None = state.get("module_context")
    db = state["db"]

    if module_context is None:
        raise ValueError("module_context is not available in state")

    cfg = get_llm_config(
        db,
        "module_image_generator_prompt",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model).with_structured_output(ModuleImageSpec)

    user_prompt = f"""KURZ: {module_context.course_title}
MODUL: {module_context.module_title}
OBSAH MODULU: {module_context.learn_block_content or "-"}

ZAŘAZENÍ KURZU (číselníky):
PŘEDMĚT / OBOR: {module_context.subject_name or "-"}
BLOK: {module_context.block_name or "-"} - {module_context.block_description or "-"}
CÍLOVÁ SKUPINA: {module_context.target_name or "-"} - {module_context.target_description or "-"}"""

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(content=user_prompt),
    ]

    image_spec: ModuleImageSpec = llm.invoke(messages)

    state["image_spec"] = image_spec
    state["image_prompt"] = render_module_prompt(image_spec)

    print(f"Image spec: {image_spec.model_dump()}")
    print(f"Image prompt:\n{state['image_prompt']}")

    return state
