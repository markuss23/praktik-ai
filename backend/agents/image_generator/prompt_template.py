"""Pevné části promptů podle designového systému coverů (module-covers.md).

Sdílí je generátor coveru kurzu i generátor obrázku modulu. LLM rozhoduje jen
o proměnných (ImageSpec); styl, kompozice a negace jsou napevno tady, aby byl
image prompt pro všechny porovnávané modely identický.
"""

from collections.abc import Iterable

from agents.image_generator.state import ImageContext, ImageSpec

# Hexy jsou orientační hodnoty tokenů z module-covers.md (image modely tokeny neznají).
# Slovní název barvy je před hexem schválně - image modely drží názvy barev
# mnohem spolehlivěji než hex kódy.
TONE_COLORS: dict[str, tuple[str, str]] = {
    "purple": ("soft lavender purple (#857AD2)", "bright orange (#F87B1B)"),
    "green": ("fresh medium green (#59AC77)", "warm yellow (#F5C542)"),
    "blue": ("vivid royal blue (#383BF5)", "bright orange (#F87B1B)"),
    "rose": ("deep rose red (#B1475C)", "warm yellow (#F5C542)"),
    "orange": ("bright orange (#F87B1B)", "vivid royal blue (#383BF5)"),
}

IMAGE_PROMPT_TEMPLATE = (
    "Flat vector cover illustration, wide landscape banner, single solid {background} "
    "background filling the entire canvas, no gradient, no texture, no grid. "
    "The background must be exactly {background} - never black, dark gray, white or any other color.\n"
    "White 3px line-art diagram showing how {mechanism}, rounded caps and joins, no filled shapes.\n"
    "Left third: {left_object}. Right two thirds: {right_schema}.\n"
    "Exactly one element highlighted in {accent} as the focal point: {accent_element}.\n"
    "Generous empty space, a few small white dots in empty corners.\n"
    "Keep all drawing in the central safe area, edges may be cropped.\n"
    "No text, no letters, no logos, no shadows, no 3D, no photorealism."
)

# Systémový prompt pro LLM, které vybírá ImageSpec. Proměnné části:
#   intro          - první věta: co se navrhuje (cover kurzu / obrázek modulu)
#   unit           - "kurzu" / "modulu" (co se v něm učí)
#   motif_examples - příklady "ne ikona, ale schéma" pro daný typ
#   extra_rules    - další odrážky KÁNONU specifické pro daný typ
#   tone_source    - odkud má LLM brát obor pro volbu tónu
SYSTEM_PROMPT_TEMPLATE = (
    "{intro} Styl je daný a neměníš ho: plochá ilustrace, jedna plná barva podkladu, "
    "bílá linková kresba, jeden barevný akcent. Ty rozhoduješ pouze o obsahu kresby.\n\n"
    "KÁNON:\n"
    "- Motiv je SCHÉMA, ne obrázek. Kreslí se mechanismus toho, co se v {unit} učí, "
    "ne ikona tématu. {motif_examples}\n"
    "{extra_rules}"
    "- Kompozice zleva doprava: OBJEKT (jeden uzavřený tvar, ukotví oko) -> SCHÉMA (diagram, který nese sdělení).\n"
    "- Akcentem se zvýrazní přesně JEDNA věc: jedna cesta, jeden bod, jeden výsledek.\n"
    "- Tón podle oboru: purple = matematika a exaktní obory, green = AI, data, analytika, "
    "blue = vývoj, nástroje, verzování, rose a orange = ostatní obory. Příbuzné obory sdílí tón. "
    "{tone_source}\n"
    "- Blok a cílová skupina určují úroveň abstrakce: pro začátečníky a mladší publikum jednodušší "
    "schéma s méně prvky, pro pokročilé může být diagram odbornější.\n"
    "- Motiv musí být poznatelný i při šířce 200 px - žádné drobné detaily.\n\n"
    "POSTUP:\n"
    "1. Napiš jednou anglickou větou, co se v {unit} učí - mechanismus, ne název.\n"
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


def render_system_prompt(
    *,
    intro: str,
    unit: str,
    motif_examples: str,
    tone_source: str,
    extra_rules: Iterable[str] = (),
) -> str:
    """Složí výchozí systémový prompt pro výběr ImageSpec ze sdílené šablony.

    Args:
        intro: Úvodní věta - co se navrhuje (např. "Navrhuješ cover ... kurzu podle ...").
        unit: Slovo v 6. pádě pro "co se v ... učí", např. "kurzu" nebo "modulu".
        motif_examples: Příklady "ne ikona, ale schéma" pro daný typ obrázku.
        tone_source: Věta, odkud má LLM brát obor pro volbu tónu.
        extra_rules: Další odrážky KÁNONU specifické pro daný typ (bez "- " na začátku).
    """
    return SYSTEM_PROMPT_TEMPLATE.format(
        intro=intro,
        unit=unit,
        motif_examples=motif_examples,
        tone_source=tone_source,
        extra_rules="".join(f"- {rule}\n" for rule in extra_rules),
    )


def render_classification(context: ImageContext) -> str:
    """Vrátí blok "ZAŘAZENÍ KURZU (číselníky)" pro user prompt z číselníkových polí kontextu.

    Args:
        context: Kontext s poli subject_name, block_*, target_* (CourseContext / ModuleContext).
    """
    return (
        "ZAŘAZENÍ KURZU (číselníky):\n"
        f"PŘEDMĚT / OBOR: {context.subject_name or '-'}\n"
        f"BLOK: {context.block_name or '-'} - {context.block_description or '-'}\n"
        f"CÍLOVÁ SKUPINA: {context.target_name or '-'} - {context.target_description or '-'}"
    )


def render_image_prompt(spec: ImageSpec) -> str:
    """Dosadí ImageSpec do šablony a vrátí finální prompt pro image model.

    Args:
        spec: Proměnné části obrázku vybrané LLM (mechanismus, objekt, schéma, akcent, tón).
    """
    background, accent = TONE_COLORS[spec.tone]
    # Věta se dosazuje za "showing how", takže bez velkého písmene a koncové tečky.
    mechanism = spec.mechanism.strip().rstrip(".")
    mechanism = mechanism[:1].lower() + mechanism[1:]
    return IMAGE_PROMPT_TEMPLATE.format(
        background=background,
        accent=accent,
        mechanism=mechanism,
        left_object=spec.left_object,
        right_schema=spec.right_schema,
        accent_element=spec.accent_element,
    )
