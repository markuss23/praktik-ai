from langchain_core.messages import HumanMessage, SystemMessage

from agents.base.llm import get_llm_config, create_chat_llm
from agents.image_generator.prompt_template import render_cover_prompt
from agents.image_generator.state import CourseContext, CoverSpec, ImageGeneratorState

DEFAULT_MODEL = "claude-sonnet-5"

DEFAULT_PROMPT = (
    "Navrhuješ cover (obrázek karty) pro vzdělávací kurz podle pevného designového systému. "
    "Styl je daný a neměníš ho: plochá ilustrace, jedna plná barva podkladu, bílá linková kresba, "
    "jeden barevný akcent. Ty rozhoduješ pouze o obsahu kresby.\n\n"
    "KÁNON:\n"
    "- Motiv je SCHÉMA, ne obrázek. Kreslí se mechanismus toho, co se v kurzu učí, ne ikona tématu. "
    "Cover pro Git není logo Gitu, ale graf větví. Cover pro AI není robot, ale síť s prosvícenou cestou.\n"
    "- Kompozice zleva doprava: OBJEKT (jeden uzavřený tvar, ukotví oko) -> SCHÉMA (diagram, který nese sdělení).\n"
    "- Akcentem se zvýrazní přesně JEDNA věc: jedna cesta, jeden bod, jeden výsledek.\n"
    "- Tón podle oboru: purple = matematika a exaktní obory, green = AI, data, analytika, "
    "blue = vývoj, nástroje, verzování, rose a orange = ostatní obory. Příbuzné obory sdílí tón. "
    "Obor ber primárně z pole PŘEDMĚT / OBOR (číselník), texty kurzu jsou až druhotné.\n"
    "- Blok a cílová skupina určují úroveň abstrakce: pro začátečníky a mladší publikum jednodušší "
    "schéma s méně prvky, pro pokročilé může být diagram odbornější.\n"
    "- Motiv musí být poznatelný i při šířce 200 px - žádné drobné detaily.\n\n"
    "POSTUP:\n"
    "1. Napiš jednou anglickou větou, co se v kurzu učí - mechanismus, ne název.\n"
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


def build_prompt_node(state: ImageGeneratorState) -> ImageGeneratorState:
    """Node pro sestavení image promptu: LLM vybere CoverSpec, kód ho dosadí do pevné šablony."""
    print("Sestavuji specifikaci coveru z kontextu kurzu...")

    course_context: CourseContext | None = state.get("course_context")
    db = state["db"]

    if course_context is None:
        raise ValueError("course_context is not available in state")

    cfg = get_llm_config(
        db,
        "image_generator_prompt",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model).with_structured_output(CoverSpec)

    user_prompt = f"""KURZ: {course_context.title}
POPIS: {course_context.description or "-"}
SHRNUTÍ: {course_context.summary or "-"}

ZAŘAZENÍ KURZU (číselníky):
PŘEDMĚT / OBOR: {course_context.subject_name or "-"}
BLOK: {course_context.block_name or "-"} - {course_context.block_description or "-"}
CÍLOVÁ SKUPINA: {course_context.target_name or "-"} - {course_context.target_description or "-"}"""

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(content=user_prompt),
    ]

    cover_spec: CoverSpec = llm.invoke(messages)

    state["cover_spec"] = cover_spec
    state["image_prompt"] = render_cover_prompt(cover_spec)

    print(f"Cover spec: {cover_spec.model_dump()}")
    print(f"Image prompt:\n{state['image_prompt']}")

    return state
