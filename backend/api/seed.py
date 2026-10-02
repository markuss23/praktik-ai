from sqlalchemy.orm import Session
from sqlalchemy import text

from api.database import SessionLocal
from api.models import (
    CrossSubject,
    BloomLevel,
    CourseBlock,
    CourseEqfLevel,
    CourseLevel,
    CourseRequirement,
    CourseSubject,
    CourseTarget,
    CourseType,
    KrauuCompetence,
    NeuroPrinciple,
    SystemSetting,
)

COURSE_BLOCKS: list[dict[str, str]] = [
    {"code": "blok.a", "name": "Kontext", "description": "Porozumění principům AI"},
    {"code": "blok.b", "name": "Transformace", "description": "Redesign výuky a hodnocení"},
    {"code": "blok.c", "name": "Aplikace", "description": "Oborové kurzy"},
]

COURSE_TARGETS: list[dict[str, str]] = [
    {"code": "target.a", "name": "Akademik", "description": "Vysokoškolský"},
    {"code": "target.s", "name": "Student", "description": "Student učitelství"},
    {"code": "target.m", "name": "Mentor", "description": "Fakultní učitel"},
    {"code": "target.host", "name": "Host", "description": "Externí účastník"},
]

COURSE_REQUIREMENTS: list[dict[str, str]] = [
    {
        "code": "req.p",
        "name": "Povinný",
        "description": "Nutný pro pokračování v kurikulu",
    },
    {
        "code": "req.d",
        "name": "Doporučený",
        "description": "Doporučená sekvence",
    },
    {
        "code": "req.v",
        "name": "Volitelný",
        "description": "Doplňkový kurz",
    },
]

COURSE_EQF_LEVELS: list[dict[str, str]] = [
    {
        "code": "6",
        "name": "Bakalářský stupeň",
        "description": "Odpovídá bakalářskému studiu (Bc.)",
    },
    {
        "code": "7",
        "name": "Magisterský / navazující stupeň",
        "description": "Nejčastější pro pedagogy UJEP (Mgr., Ing.)",
    },
    {
        "code": "8",
        "name": "Doktorský stupeň",
        "description": "Pro specializované kurzy odborníků (Ph.D.)",
    },
]

COURSE_LEVELS: list[dict[str, str]] = [
    {"code": "level.1", "name": "Vstupní", "description": "Bez předchozí zkušenosti s AI"},
    {"code": "level.2", "name": "Středně pokročilý", "description": "Základní orientace s AI"},
    {"code": "level.3", "name": "Pokročilý", "description": "Aktivní práce s AI ve výuce"},
]

COURSE_TYPES: list[dict[str, str]] = [
    {
        "code": "type.obecny",
        "name": "Obecný",
        "description": "Platí pro všechny obory",
    },
    {
        "code": "type.obor",
        "name": "Oborový",
        "description": "Specifický pro jeden obor",
    },
    {
        "code": "type.prurezovy",
        "name": "Průřezový",
        "description": "Přesahuje skupiny C",
    },
    {
        "code": "type.vstupni",
        "name": "Vstupní kurz skupiny",
        "description": "Vstupní kurz pro skupinu C bloků",
    },
    {
        "code": "type.spec",
        "name": "Specializovaný",
        "description": "Pro konkrétní roli",
    },
]

NEURO_PRINCIPLES: list[dict[str, str]] = [
    {"code": "NP-01", "name": "Neuroplasticita", "description": "Opakované učení mění strukturu synaptických sítí v mozku"},
    {"code": "NP-02", "name": "Distribuované opakování", "description": "Učení rozložené v čase vede k trvalejšímu zapamatování"},
    {"code": "NP-03", "name": "Aktivní vybavování", "description": "Vědomé vybavování z paměti posiluje stopu víc než pasivní čtení"},
    {"code": "NP-04", "name": "Žádoucí obtíže", "description": "Mírná obtížnost a kognitivní zápas prohlubují zpracování a transfer"},
    {"code": "NP-05", "name": "Prokládání", "description": "Střídání různých typů úloh podporuje rozlišování konceptů"},
    {"code": "NP-06", "name": "Duální kódování", "description": "Kombinace verbální a vizuální reprezentace vytváří dvě paměťové stopy"},
    {"code": "NP-07", "name": "Kognitivní zátěž", "description": "Pracovní paměť má kapacitu cca 4 ± 1 prvků; přetížení blokuje učení"},
    {"code": "NP-08", "name": "Elaborativní kódování", "description": "Propojení nové informace s existujícími znalostmi tvoří síť asociací"},
    {"code": "NP-09", "name": "Efekt generování", "description": "Sám vytvořená informace se pamatuje lépe než pasivně přijatá"},
    {"code": "NP-10", "name": "Testovací efekt", "description": "Samotné testování konsoliduje dlouhodobou paměť silněji než čtení"},
    {"code": "NP-11", "name": "Predikční chyba", "description": "Dopaminový systém reaguje na rozdíl mezi očekáváním a realitou"},
    {"code": "NP-12", "name": "Konsolidace ve spánku", "description": "Spánek přepisuje paměťové stopy z hipokampu do neokortexu"},
    {"code": "NP-13", "name": "Pozornost a pracovní paměť", "description": "Bez selektivní pozornosti nedochází ke kódování"},
    {"code": "NP-14", "name": "Slučování do bloků", "description": "Sdružování informací do smysluplných bloků zvyšuje kapacitu paměti"},
    {"code": "NP-15", "name": "Metakognice", "description": "Schopnost přemýšlet o vlastním myšlení a sledovat porozumění"},
    {"code": "NP-16", "name": "Zrcadlové neurony", "description": "Pozorování postupu druhého aktivuje stejné okruhy jako vlastní provádění"},
    {"code": "NP-17", "name": "Stav plynutí (flow)", "description": "Optimální poměr výzvy a dovednosti maximalizuje zapojení a učení"},
    {"code": "NP-18", "name": "Okamžitá zpětná vazba", "description": "Rychlá konkrétní zpětná vazba umožní opravit chybu dřív než se zafixuje"},
    {"code": "NP-19", "name": "Vtělené poznávání", "description": "Tělesné zapojení (gesta, řeč nahlas, kreslení) posiluje zpracování"},
    {"code": "NP-20", "name": "Schémata", "description": "Nové informace se snáze ukládají při napojení na existující schéma"},
]

KRAUU_COMPETENCES: list[dict[str, str]] = [
    {"code": "1.0", "name": "Oblast 1 – Obsah a didaktika", "description": ""},
    {"code": "1.1", "name": "Rozumí vyučovaným oborům a rozvíjí se v nich", "description": "Učitel/ka rozumí oborům, které vyučuje, a systematicky se v nich rozvíjí."},
    {"code": "1.2", "name": "Didakticky zprostředkovává obsah žákům", "description": "Zprostředkovává obsah žákům v souladu s jejich vzdělávacími potřebami."},
    {"code": "2.0", "name": "Oblast 2 – Plánování, vedení a reflexe výuky", "description": ""},
    {"code": "2.1", "name": "Nastavuje cíle výuky", "description": "Stanovuje srozumitelné cíle a vede k jejich nastavování i žáky."},
    {"code": "2.2", "name": "Poznává vzdělávací potřeby a plánuje výuku", "description": "Plánuje výuku tak, aby každý žák mohl aktivně dosahovat cílů."},
    {"code": "2.3", "name": "Podporuje zvídavost a motivaci žáků", "description": "Podporuje u žáků zvídavost a motivaci k učení."},
    {"code": "2.4", "name": "Efektivně vede výuku a zjišťuje porozumění", "description": "Vede výuku efektivně, zjišťuje porozumění a reaguje na potřeby žáků."},
    {"code": "2.5", "name": "Reflektuje výuku", "description": "Reflektuje vlastní výuku a vyhodnocuje dosahování cílů."},
    {"code": "3.0", "name": "Oblast 3 – Prostředí pro učení", "description": ""},
    {"code": "3.1", "name": "Vytváří bezpečné prostředí pro učení", "description": "Vytváří fyzicky i psychicky bezpečné prostředí pro učení."},
    {"code": "3.2", "name": "Vede žáky k chování podporujícímu učení", "description": "Vede žáky k chování podporujícímu vlastní učení i spolupráci."},
    {"code": "3.3", "name": "Uspořádání fyzického a digitálního prostředí", "description": "Zajišťuje vhodné uspořádání fyzického a digitálního prostředí učení."},
    {"code": "4.0", "name": "Oblast 4 – Zpětná vazba a hodnocení", "description": ""},
    {"code": "4.1", "name": "Hodnotí na základě kritérií", "description": "Hodnotí žáky na základě jasných kritérií a vede k tomu i žáky."},
    {"code": "4.2", "name": "Poskytuje a přijímá zpětnou vazbu", "description": "Poskytuje žákům konstruktivní zpětnou vazbu a sám přijímá ZV od žáků."},
    {"code": "4.3", "name": "Vede žáky k reflexi jejich učení", "description": "Vede žáky k reflexi vlastního učení a samostatné metakognici."},
    {"code": "5.0", "name": "Oblast 5 – Profesní spolupráce", "description": ""},
    {"code": "5.1", "name": "Spolupracuje s kolegy a kolegyněmi", "description": "Spolupracuje s kolegy ve prospěch žáků a společného profesního růstu."},
    {"code": "5.2", "name": "Spolupracuje s rodiči a širší komunitou školy", "description": "Spolupracuje s rodiči a širší komunitou v zájmu žáků."},
    {"code": "6.0", "name": "Oblast 6 – Profesní sebepojetí, rozvoj, etika a duševní zdraví", "description": ""},
    {"code": "6.1", "name": "Utváření profesního sebepojetí a rozvoj", "description": "Systematicky pracuje na utváření profesního sebepojetí a vlastním rozvoji."},
    {"code": "6.2", "name": "Odpovědná práce s informacemi a demokratické hodnoty", "description": "Odpovědně pracuje s informacemi a digitálními nástroji, vede k etice."},
    {"code": "6.3", "name": "Duševní zdraví a psychohygiena", "description": "Systematicky pečuje o své duševní zdraví a psychohygienu."},
]

BLOOM_LEVELS: list[dict[str, str]] = [
    {"code": "1", "name": "Zapamatovat", "description": "vyjmenuje, popíše, identifikuje, rozpozná, zopakuje"},
    {"code": "2", "name": "Porozumět", "description": "vysvětlí, shrne, klasifikuje, interpretuje, přeloží"},
    {"code": "3", "name": "Aplikovat", "description": "použije, provede, řeší, demonstruje, implementuje"},
    {"code": "4", "name": "Analyzovat", "description": "porovná, rozliší, zhodnotí strukturu, rozloží, prozkoumá"},
    {"code": "5", "name": "Hodnotit", "description": "posoudí, obhájí, kriticky zhodnotí, doporučí, zdůvodní"},
    {"code": "6", "name": "Tvořit", "description": "navrhne, sestaví, vytvoří, zkonstruuje, naplánuje"},
]

CROSS_SUBJECTS: list[dict[str, str]] = [
    {"code": "O01", "name": "AI gramotnost – technický základ", "description": "Jak fungují jazykové modely, tokeny, kontextové okno, pravděpodobnostní povaha výstupu."},
    {"code": "O02", "name": "AI gramotnost – kritické posuzování výstupů", "description": "Rozpoznávání halucinací, ověřování faktů, srovnávání nástrojů a výstupů."},
    {"code": "O03", "name": "Etika a odpovědné využití AI", "description": "Etické principy práce s AI ve vzdělávání, hranice akceptovatelného použití, transparentnost."},
    {"code": "O04", "name": "Ochrana dat a soukromí ve výuce", "description": "GDPR, citlivá data žáků, bezpečné nakládání s informacemi v AI nástrojích."},
    {"code": "O05", "name": "Rozvoj kritického myšlení", "description": "Vedení žáků ke kritickému uvažování, argumentaci, posuzování zdrojů — s podporou i navzdory AI."},
    {"code": "O06", "name": "Metakognice a sebeřízené učení", "description": "Reflexe vlastního učení, uvědomování si procesu poznávání, strategie učení."},
    {"code": "O07", "name": "Plánování výuky a tvorba scénářů", "description": "Návrh výukových jednotek, cíle, aktivity, role AI ve scénáři, časové rozvržení."},
    {"code": "O08", "name": "Didaktická transformace obsahu", "description": "Převod oborového obsahu do podoby srozumitelné pro žáky daného stupně."},
    {"code": "O09", "name": "Diferenciace a inkluze (žáci se SVP)", "description": "Práce s heterogenní třídou, individuální vzdělávací plány, AI jako podpora diferenciace."},
    {"code": "O10", "name": "Hodnocení a zpětná vazba", "description": "Formativní i sumativní hodnocení, kvalitní zpětná vazba, rubriky, AI jako asistent hodnocení."},
    {"code": "O11", "name": "Tvorba zadání a úloh (AI-resistant + AI-supported)", "description": "Design zadání odolných vůči zneužití AI a zároveň zadání využívajících AI jako nástroj učení."},
    {"code": "O12", "name": "Práce s prekoncepty a miskoncepty", "description": "Diagnostika a práce s chybnými představami žáků, AI jako nástroj odhalování miskonceptů."},
    {"code": "O13", "name": "Prostředí pro učení a klima třídy", "description": "Bezpečné prostředí, pravidla práce s AI ve třídě, kultura ne/používání AI."},
    {"code": "O14", "name": "Motivace a vedení žáků", "description": "Vnitřní motivace, vedení diskuse, zapojování žáků, AI jako nástroj individualizace motivace."},
    {"code": "O15", "name": "Komunikace s rodiči a zákonnými zástupci", "description": "Vysvětlování role AI ve výuce rodičům, řešení obav, společná dohoda o pravidlech."},
    {"code": "O16", "name": "Profesní spolupráce a kolegiální učení", "description": "Sdílení dobré praxe, peer review, budování AI-gramotné školy jako celku."},
    {"code": "O17", "name": "Mentoring a uvádění začínajících učitelů", "description": "Provázení nastupujících kolegů, mentorský dialog, integrace AI do mentorské praxe."},
    {"code": "O18", "name": "Profesní sebepojetí a reflexe vlastní praxe", "description": "Vlastní identita učitele v éře AI, reflektivní praxe, profesní rozvoj."},
    {"code": "O19", "name": "Duševní zdraví a wellbeing učitele", "description": "Práce s kognitivní zátěží, využití AI pro snížení administrativy, hranice pracovního času."},
    {"code": "O20", "name": "Tvořivost a designové myšlení ve výuce", "description": "Tvořivé využití AI při návrhu výukových materiálů, design thinking v pedagogice."},
]


def _planner_catalog_fields() -> str:
    """Popis polí modulu s číselníky (NP, KRAUU, Bloom) pro prompt course_planner."""
    neuro = "\n".join(
        f"{p['code']} {p['name']} — {p['description']}" for p in NEURO_PRINCIPLES
    )
    krauu = "\n".join(
        f"{k['name']}:" if k["code"].endswith(".0")
        else f"{k['code']} {k['name']} — {k['description']}"
        for k in KRAUU_COMPETENCES
    )
    bloom = "\n".join(
        f"{b['code']} {b['name']} — {b['description']}" for b in BLOOM_LEVELS
    )
    return (
        "perex: [krátká anotace modulu, nejvýše 255 znaků, prostý text. V 1–2 větách řekni přímo "
        "věcnou podstatu tématu a proč je pro cílovou skupinu užitečné. Nepopisuj modul samotný: "
        "žádné „Modul shrnuje…“, „V tomto modulu…“, „Modul se zabývá…“, „Dozvíte se…“. "
        "Piš neosobně nebo vykej.]\n\n"
        "neuro_principle_code: [kód PŘESNĚ JEDNOHO neurovědního principu ze seznamu níže, který nejlépe "
        "odpovídá pedagogickému designu modulu. Uveď jen kód, např. \"NP-01\".\n"
        f"SEZNAM NEUROVĚDNÍCH PRINCIPŮ:\n{neuro}]\n\n"
        "krauu_competence_codes: [1–3 nejrelevantnější kompetence KRAUU (MŠMT 2023), které modul rozvíjí. "
        "Uváděj jen kódy kompetencí (např. \"1.1\", \"2.4\"), nikdy kódy oblastí končící \".0\".\n"
        f"SEZNAM KRAUU KOMPETENCÍ:\n{krauu}]\n\n"
        "bloom_level_codes: [1–3 úrovně Bloomovy taxonomie, kterým odpovídají výukové cíle modulu "
        "(co účastník po modulu umí). Uváděj jen číselné kódy, např. \"2\", \"3\".\n"
        f"SEZNAM ÚROVNÍ BLOOMOVY TAXONOMIE:\n{bloom}]\n\n"
    )


COURSE_PLANNER_PROMPT = (
    "Na základě souhrnu vytvoř strukturovaný vzdělávací kurz v češtině.\n"
    "\n"
    "CHYBĚJÍCÍ POLE: Pokud některé pole vstupního bloku chybí, postupuj takto: ÚROVEŇ POKROČILOSTI = intermediate; CÍLOVÁ SKUPINA = vysokoškolští vyučující a studující učitelství, příklady z výuky a studia; MAXIMÁLNÍ DÉLKA SOUHRNU = 3 500 znaků na téma; MAXIMÁLNÍ ČAS NA VÝKLAD = 10 minut. Náročnost tématu urči vždy.\n"
    "\n"
    "OBECNÁ PRAVIDLA:\n"
    "- Veškerý textový výstup (názvy, otázky, odpovědi, klíčová slova) je prostý text. Výjimkou je pole content v learn_blocks, kde se používají povolené HTML tagy.\n"
    "- Používej pouze fakta ze souhrnu. Když fakt chybí, nevymýšlej ho; upozorni na mezeru konkrétní formulací.\n"
    '- Nezjednodušuj nad rámec souhrnu: pro nižší úroveň zjednodušuj jazyk a stavbu výkladu, ne obsah tvrzení. Zachovej podmínky, míru nejistoty a mechanismus; kvalifikované tvrzení nepřeváděj na absolutní („omezená" ≠ „malá", „naznačuje" ≠ „prokazuje"). Analogie vždy doplň tím, kde přestává platit. Totéž platí pro otázky, možnosti i vzorové odpovědi.\n'
    '- Ilustrační situaci (modelovou ukázku z práce skupiny) smíš vytvořit, pokud přenáší princip ze souhrnu a neobsahuje nová fakta (čísla, jména, citace, pravidla). Uveď ji slovy „Představte si…" nebo „Modelová situace:".\n'
    "- Dodrž všechna PRAVIDLA PRO TVORBU ze souhrnu.\n"
    "- Rozpor ve zdrojích podle typu uvedeného v souhrnu:\n"
    '  - „nesoulad pravidel": neprezentuj ho jako spornost oboru. Uveď znění podle nejzávaznějšího zdroje (předpis > metodika > ostatní) a účastníka odkaž na ověření v plném znění. Pokud to pomůže porozumění, využij rozpor k objasnění problému (např. proč je třeba číst plné znění pravidel).\n'
    '  - „vědecký spor": vylož obě zjištění se silou důkazu. U intermediate a advanced ho využij k objasnění problému jako otevřenou otázku oboru; u beginner uveď opatrnější závěr.\n'
    "\n"
    "PROBLÉMY PRO METODIKA:\n"
    'Do výstupu nevkládej žádná hlášení, upozornění ani poznámky pro metodika. Problémy uvedené v souhrnu (řádek „Problém", oddíl PROBLÉMY PRO METODIKA) ani nesoulad parametrů (čas, počet modulů) v textu kurzu nezmiňuj; zpracuj látku co nejlépe v rámci zadaných parametrů.\n'
    "\n"
    "OSLOVENÍ A JAZYK:\n"
    "- Účastníkovi vykej a označuj ho podle DEFINICE CÍLOVÉ SKUPINY.\n"
    '- Piš genderově neutrálně: preferuj neosobní vazby a množné číslo. Vzorové odpovědi v první osobě formuluj bez příčestí minulého, pokud to jde („Zadání přeformuluji takto…").\n'
    "\n"
    "ÚROVEŇ POKROČILOSTI (týká se zkušenosti s AI, ne odbornosti v oboru; má přednost před obecnými pravidly stylu):\n"
    "- beginner: kratší věty, každý pojem týkající se AI vysvětli při prvním výskytu, nejvýše 3 nové pojmy na modul (ostatní pojmy ze souhrnu vynech), nejdřív analogie a pak pojem, postupy jako číslované kroky. Zastavení: rozpoznání a vlastní příklad. Uzavřené otázky: porozumění pojmu nebo principu. Otevřená otázka: popis situace z práce účastníka (i plánované, pokud s AI zkušenost nemá).\n"
    "- intermediate: základní pojmy jen připomeň jednou větou; těžiště v principech, důvodech a typických chybách; porovnávej postupy. Zastavení: analýza vlastního postupu. Uzavřené otázky: aplikace na situaci. Otevřená otázka: zdůvodněné rozhodnutí.\n"
    "- advanced: vynech analogie a elementární výklad; těžiště v hraničních případech, limitech, síle důkazu a institucionálních důsledcích; pracuj s protiargumenty a s větším množstvím detailů ze souhrnu. Zastavení: kritické hodnocení nebo návrh pravidla. Uzavřené otázky: věrohodné distraktory na úrovni nuancí. Otevřená otázka: argumentace s protiargumentem.\n"
    "\n"
    "CÍLOVÁ SKUPINA:\n"
    "Příklady, zastavení a otázky zasaď do typických pracovních situací z DEFINICE CÍLOVÉ SKUPINY. Pravidla používej jen ta, která se podle definice na skupinu vztahují, a jen tam, kde se jich téma kurzu týká – kurz o jiném tématu nemusí pravidla skupiny vůbec zmiňovat. Pravidla určená jiné skupině nepřenášej bez výslovné opory v souhrnu.\n"
    "\n"
    "DÉLKA VÝKLADU (learn_blocks = fáze F1, příručka ke čtení, 5–10 minut, 130 slov za minutu):\n"
    "Délku výkladu modulu urči podle úrovně a náročnosti tématu uvedené v souhrnu:\n"
    "- beginner: 5 min (600–700 slov); vysoká náročnost 6 min (700–850 slov)\n"
    "- intermediate: 7 min (850–1 000 slov); vysoká náročnost 8 min (950–1 100 slov)\n"
    "- advanced: 9 min (1 100–1 250 slov); vysoká náročnost 10 min (1 250–1 400 slov)\n"
    "Rozsah z tabulky je horní mez; nepřekroč ani MAXIMÁLNÍ ČAS NA VÝKLAD. Piš tolik, kolik souhrn unese bez vymýšlení – nikdy neprodlužuj výklad vymýšlením. Delší výklad pokročilé úrovně tvoří detaily, nuance a protiargumenty, ne opakování.\n"
    "\n"
    "STRUKTURA MODULU:\n"
    "title: [výstižný název, 1–200 znaků]\n"
    "\n"
    ""
    + _planner_catalog_fields()
    +
    "learn_blocks:\n"
    "- content: [\n"
    "    Nový výukový text, ne shrnutí a ne opis. Pořadí:\n"
    "    1. Proč je téma pro cílovou skupinu důležité.\n"
    "    2. Hlavní myšlenka (u beginner s analogií, u advanced rovnou s vymezením).\n"
    "    3. Klíčové pojmy s vysvětlením.\n"
    "    4. Vztahy, příčiny a důsledky.\n"
    "    5. Příklad z práce cílové skupiny.\n"
    "    6. Nuance a časté omyly (u advanced těžiště výkladu).\n"
    "    7. Krátké shrnutí.\n"
    "\n"
    "    ZASTAVENÍ: vlož 1–2 zastavení v <blockquote>, formulovaná podle úrovně, například:\n"
    "    <blockquote>Zastavte se: Jak byste vlastními slovy vysvětlili rozdíl mezi těmito dvěma pojmy?</blockquote>\n"
    "\n"
    "    DOPORUČENÍ PRO AI ASISTENTA: VŽDY vlož na konec bloku konkrétní zadání, které AI asistenta použije jako oponenta, ne jako vysvětlovače. Účastník nejdřív formuluje vlastní odpověď, AI ji prověří. Zadání se váže k látce modulu a v jednotlivých modulech se neopakuje. Například:\n"
    '    <blockquote>Napište si vlastní vysvětlení [pojem] a pak asistenta požádejte: „Tady je moje vysvětlení [pojem]. Kde je nepřesné nebo neúplné? Neopravujte ho za mě, jen ukažte místa."</blockquote>\n'
    '    Nikdy nenavrhuj zadání typu „Vysvětli mi…" nebo „Napiš mi…".\n'
    "\n"
    "    POVOLENÉ HTML TAGY: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>. Žádné jiné tagy, žádný markdown.\n"
    "  ]\n"
    "\n"
    "practice_questions: PŘESNĚ 3 otázky – dvě uzavřené (question_type: closed, 3 closed_options, correct_answer doslova shodný s textem jedné z možností) a třetí otevřená (question_type: open, neprázdný example_answer, 3 open_keywords).\n"
    "\n"
    "PRAVIDLA PRO OTÁZKY (procvičování; platforma je hodnotí automaticky):\n"
    "Obecně:\n"
    "- Všechny otázky ověřují látku z learn_blocks daného modulu na úrovni podle ÚROVNĚ POKROČILOSTI; každá musí jít zodpovědět jen z výkladu modulu. Na zastavení ani doporučení pro AI asistenta se otázky nevážou.\n"
    "- Každá ze tří otázek ověřuje něco jiného: otázka 1 klíčový pojem nebo princip, otázka 2 jeho použití nebo rozlišení v situaci, otázka 3 porozumění podle úrovně.\n"
    "- Otázky zasaď do situací cílové skupiny. Vykej.\n"
    "Uzavřené otázky (platforma porovnává odpověď doslova s textem možnosti):\n"
    '- Právě jedna možnost je správná; ostatní dvě jsou podle výkladu jednoznačně nesprávné, ne jen „méně vhodné".\n'
    "- Tři možnosti se textově liší, každá má nejvýše 250 znaků. correct_answer zkopíruj znak po znaku z textu správné možnosti.\n"
    "- Distraktory vycházejí z typických omylů nebo mýtů uvedených ve výkladu, mají podobnou délku a stavbu jako správná odpověď; správná odpověď není nejdelší ani nejpodrobnější. Pozici správné odpovědi v otázkách střídej.\n"
    '- Nepoužívej „všechny uvedené", „žádná z uvedených", dvojí zápor ani absolutní slova („vždy", „nikdy") jako nápovědu.\n'
    "- beginner: porozumění pojmu nebo principu; intermediate: použití v situaci; advanced: rozlišení nuancí – distraktory jsou částečně pravdivé, ale v jednom podstatném bodě chybné.\n"
    "Otevřená otázka (hodnotí ji AI jen podle otázky a výukového textu; vzorovou odpověď ani klíčová slova nevidí):\n"
    "- Účastník může napsat nejvýše 500 znaků: úplná odpověď se musí vejít do 2–4 vět. Správnost musí jít posoudit jen z výkladu modulu; nežádej fakta, která ve výkladu nejsou.\n"
    '- Všechno, co se bude hodnotit, musí být v otázce výslovně: části odpovědi vyjmenuj (nejvýše 3, např. „(1) rozhodněte, (2) zdůvodněte"); požadované pojmy pojmenuj; vlastní zkušenost žádej jen výslovně. Nežádej jména autorů, roky ani přesná čísla.\n'
    '- Žádné otázky typu ano/ne ani „vyjmenujte".\n'
    "- beginner: popis situace z práce účastníka s použitím pojmu z modulu; intermediate: zdůvodněné rozhodnutí v situaci; advanced: stanovisko s protiargumentem.\n"
    "- example_answer: 2–4 věty, nejvýše 500 znaků, na úrovni kurzu, genderově neutrálně.\n"
    "- open_keywords: 3 klíčové body, které dobrá odpověď obsahuje (myšlenka nebo pojem, každý nejvýše 60 znaků), ne vytržená slova.\n"
    "- Počet otázek je vždy 3: 2 uzavřené, 1 otevřená."
)


SYSTEM_SETTINGS: list[dict[str, str]] = [
    {
        "key": "course_summarizer",
        "name": "Sumarizátor kurzu",
        "model": "gpt-5.2",
        "prompt": (
            "Analyzuj následující obsah a vytvoř strukturovaný souhrn, ze kterého jiný model napíše vzdělávací kurz. Tento model uvidí POUZE tvůj souhrn, nikoli zdroje. Co v souhrnu chybí, v kurzu nebude.\n"
            "\n"
            "CHYBĚJÍCÍ POLE: Pokud některé pole vstupního bloku chybí, postupuj takto: ÚROVEŇ POKROČILOSTI = intermediate; CÍLOVÁ SKUPINA = vysokoškolští vyučující a studující učitelství, příklady z výuky a studia; MAXIMÁLNÍ DÉLKA SOUHRNU = 3 500 znaků na téma; MAXIMÁLNÍ ČAS NA VÝKLAD = 10 minut. Náročnost tématu urči vždy.\n"
            "\n"
            "ZÁSADNÍ PRAVIDLO – ŽÁDNÉ HALUCINACE:\n"
            "Veškerý obsah souhrnu musí pocházet výhradně z poskytnutých zdrojů. Nepřidávej informace, příklady ani vysvětlení, které ve zdrojích nejsou. Pokud zdroje k tématu nestačí, téma zkrať; nevymýšlej.\n"
            "\n"
            "ROLE ZDROJŮ:\n"
            "- Soubory s obsahem (výklad, příklady, data) zpracuj jako látku.\n"
            "- Soubory s pokyny pro tvorbu kurzu (zápis z rozhovoru s autorem, QA report, východiska, pravidla, zakázané formulace) nezpracovávej jako látku. Závazná pravidla z nich vypiš do oddílu PRAVIDLA PRO TVORBU.\n"
            "- Pokud je mezi zdroji hotový kurz, použij jeho výklad (F1) jako hlavní osnovu; fakta ověřuj proti ostatním zdrojům, pokud existují. Jeho capstone, artefakt, rubriku, testy a aktivity F2–F4 nezpracovávej a nehlas – platforma je zatím negeneruje. Parametry ve vstupním bloku (počet modulů, délka, úroveň, cílová skupina) mají přednost před parametry uvedenými v hotovém kurzu.\n"
            "\n"
            "INSTRUKCE:\n"
            "1. Rozděl obsah do PŘESNĚ tolika tematických celků, kolik uvádí POČET MODULŮ. Pokud obsah pokrývá méně témat, rozděl dostupnou látku na logické části bez vymýšlení nového obsahu.\n"
            "2. Úroveň pokročilosti se týká zkušenosti účastníka s AI, ne jeho odbornosti v oboru. Látku vybírej podle ÚROVNĚ POKROČILOSTI:\n"
            "   - beginner: základní pojmy s jednoduchou definicí, jeden mentální model na téma, návodné postupy krok za krokem.\n"
            "   - intermediate: principy, důvody a typické chyby; srovnání postupů; pojmy s definicí.\n"
            "   - advanced: navíc hraniční případy, limity, sporná místa, síla důkazu, institucionální a etické souvislosti; pojmy s přesnou definicí.\n"
            '3. Příklady vybírej podle DEFINICE CÍLOVÉ SKUPINY. Pokud zdroje větví obsah podle profilu, převezmi větev skupiny (větve „Mentor / provázející učitel" i „Učitel ZŠ/SŠ" patří skupině Mentor). Pokud pro skupinu příklad chybí, napiš „příklad pro skupinu ve zdrojích chybí" a uveď nejbližší příklad z jiné větve s označením, pro koho platí.\n'
            "4. U každého tématu urči náročnost:\n"
            "   - nízká: nejvýše 2 nové pojmy, konkrétní a známé situace,\n"
            "   - střední: 3–4 pojmy nebo jeden abstraktní princip,\n"
            "   - vysoká: 5 a více pojmů, abstraktní model, právní nebo výzkumný rámec.\n"
            "5. U každého čísla, výsledku studie nebo pravidla zachovej kontext: čeho se údaj týká (obor, populace, typ studie), odkud je (autor, rok, dokument, odstavec) a jaká je síla důkazu (recenzovaná studie, metaanalýza, preprint, názor).\n"
            '5a. NEZJEDNODUŠUJ NAD RÁMEC ZDROJE: zachovej podmínky, míru nejistoty a mechanismus tvrzení. Kvalifikované tvrzení nepřeváděj na absolutní („omezená kapacita" ≠ „malá paměť", „naznačuje" ≠ „prokazuje", „u části dětí" ≠ „u dětí"). Když zdroj uvádí mechanismus (např. že kapacitu určuje počet celků a jejich velikost závisí na seskupení), zachovej ho.\n'
            '6. Pokud si zdroje odporují, nerozhoduj za ně. Zapiš rozpor do řádku „Rozpor ve zdrojích" s oběma stanovisky a jejich zdrojem a označ typ: „vědecký spor" (dvě výzkumná zjištění) nebo „nesoulad pravidel" (předpisy, metodiky, interní dokumenty).\n'
            '7. KRITICKÝ PROBLÉM zapiš do řádku „Problém" u tématu (nebo do oddílu PROBLÉMY PRO METODIKA, týká-li se celého kurzu). Kritický je jen problém, který brání správnému vytvoření kurzu:\n'
            "   - látka tématu se nevejde do MAXIMÁLNÍHO ČASU NA VÝKLAD → navrhni rozdělení na 2 moduly (názvy a obsah obou),\n"
            "   - látky tématu je ve zdrojích tak málo, že nestačí ani na nejkratší výklad (5 minut, asi 600 slov) → navrhni sloučení s jiným tématem nebo doplnění zdroje,\n"
            "   - látku nelze smysluplně rozdělit do zadaného POČTU MODULŮ → navrhni jiný počet a rozvržení.\n"
            '   Jiné nedostatky (chybějící příklad, rozpor, fakt bez kontextu) nejsou kritické: řeš je v souhrnu (poznámka, řádek „Rozpor ve zdrojích"), nehlas je.\n'
            "\n"
            "VÝSTUP (prostý text, řádky začínej pomlčkou, žádné jiné formátování):\n"
            "\n"
            "PROBLÉMY PRO METODIKA:\n"
            '- [jen kritické problémy celého kurzu; pokud žádné nejsou, napiš „žádné"]\n'
            "\n"
            "TÉMA 1: [název]\n"
            "- Náročnost: [nízká | střední | vysoká]\n"
            "- Klíčové pojmy: [pojem – definice; …]\n"
            "- Látka k naučení: [vysvětlení s kontextem]\n"
            "- Testovatelná fakta: [údaj – kontext – zdroj]\n"
            "- Příklady pro skupinu: [příklad ze zdrojů, nebo poznámka o chybějícím příkladu]\n"
            "- Rozpor ve zdrojích: [jen pokud existuje]\n"
            "- Problém: [jen kritický problém; typ – popis – návrh řešení]\n"
            "\n"
            "TÉMA 2: …\n"
            "\n"
            "PRAVIDLA PRO TVORBU:\n"
            '- [závazná pravidla a zakázané formulace ze zdrojů s pokyny pro tvorbu; pokud žádná nejsou, napiš „žádná"]\n'
            "\n"
            'ROZSAH: Na jedno téma připadá asi tolik znaků, kolik uvádí údaj „znaků na téma" v poli MAXIMÁLNÍ DÉLKA SOUHRNU; celkový limit v tomtéž poli nepřekroč. Když zdroj na téma víc látky nemá, souhrn tématu zkrať – nedoplňuj ho. Piš česky. Když musíš krátit, zachovej v tomto pořadí: problémy > definice a kontext faktů > rozpory a pravidla > příklady pro skupinu > další látka.'
        ),
        "description": "LLM pro sumarizaci zdrojového obsahu kurzu před generováním modulů.",
    },
    {
        "key": "course_planner",
        "name": "Plánovač kurzu",
        "model": "gpt-5.4",
        "prompt": COURSE_PLANNER_PROMPT,
        "description": "LLM pro generování struktury kurzu (moduly, otázky) ze sumarizace.",
    },
    {
        "key": "assessment_generator",
        "name": "Generátor otázek",
        "model": "gpt-5.2",
        "prompt": (
            "Jsi odborný lektor. Na základě níže uvedeného výukového textu "
            "vytvoř jednu otevřenou kontrolní otázku.\n\n"
            "Pravidla:\n"
            "- Otázka musí být zodpověditelná výhradně z poskytnutého textu\n"
            "- Ověřuj porozumění, ne memorování\n"
            "- Otázka musí být v češtině\n"
            "- Otázka musí být konkrétní a jednoznačná\n"
            "- Délka otázky: 1-2 věty"
        ),
        "description": "LLM pro generování assessment otázek z výukového obsahu.",
    },
    {
        "key": "assessment_evaluator",
        "name": "Evaluátor odpovědí",
        "model": "claude-sonnet-4-6",
        "prompt": (
            "Jsi přísný, ale spravedlivý lektor. Vyhodnoť odpověď studenta na kontrolní otázku.\n\n"
            "K dispozici máš:\n"
            "1. Výukový text (zdroj správných informací)\n"
            "2. Kontrolní otázku\n"
            "3. Odpověď studenta\n\n"
            "Pravidla hodnocení:\n"
            "- Hodnoť VÝHRADNĚ na základě poskytnutého výukového textu\n"
            "- Ověřuj věcnou správnost, ne stylistiku\n"
            "- Částečně správná odpověď získá částečné body\n"
            "- Zcela špatná nebo prázdná odpověď = 0 bodů\n"
            "- Za úspěšné splnění považuj skóre odpovídající minimálnímu požadavku modulu\n\n"
            "Pravidla pro zpětnou vazbu:\n"
            "- NIKDY neprozrazuj správnou odpověď ani její části\n"
            "- Pouze naznač, ve které oblasti má student mezery "
            "(např. \u201eChybí vám pochopení vztahu mezi X a Y\u201c)\\n"
            "- Při neúspěchu motivuj studenta k dalšímu studiu, ale NEŘÍKEJ mu, co měl napsat\n"
            "- Cílem je, aby se student vrátil k výukovému materiálu a odpověď našel sám\n\n"
            "Odpověz PŘESNĚ v tomto formátu (3 řádky, nic jiného):\n"
            "SCORE: <číslo 0-100>\n"
            "PASSED: <true nebo false>\n"
            "FEEDBACK: <zpětná vazba v 1-3 větách, v češtině, BEZ správné odpovědi>"
        ),
        "description": "LLM pro vyhodnocení odpovědí studentů na assessment otázky.",
    },
    {
        "key": "mentor_reranker",
        "name": "Mentor – reranker",
        "model": "gpt-4o-mini",
        "prompt": (
            "Máš seznam dokumentů a otázku uživatele.\n"
            "Seřaď dokumenty podle relevance k otázce (nejrelevantnější první).\n\n"
            "Vrať POUZE čísla dokumentů seřazená od nejrelevantnějšího "
            "(např: 3, 7, 1, 5).\n"
            "Odpověz pouze čísly oddělenými čárkami, nic dalšího."
        ),
        "description": "LLM pro přeřazení dokumentů podle relevance v RAG mentoru.",
    },
    {
        "key": "mentor_answer",
        "name": "Mentor – odpověď",
        "model": "gpt-5-mini",
        "prompt": (
            "Jsi AI asistent pro výuku - mentor studenta.\n"
            "Odpovídáš na otázky studenta POUZE na základě poskytnutého kontextu z učebních materiálů.\n\n"
            "PRAVIDLA:\n"
            "- Odpověz výhradně na základě poskytnutého kontextu\n"
            "- Pokud kontext neobsahuje odpověď, řekni to otevřeně\n"
            "- Buď přátelský, trpělivý a pedagogický\n"
            "- Používej příklady z kontextu pro lepší pochopení\n"
            "- Pokud student nerozumí, zkus vysvětlit jinak\n"
            "- Odpovídej vždy v češtině\n"
            "- odpověd maximálně 500 znaků"
        ),
        "description": "LLM pro generování odpovědí AI mentora na otázky studentů.",
    },
]

COURSE_SUBJECTS: list[dict[str, str]] = [
    {"code": "obor.01", "name": "Český jazyk a literatura"},
    {"code": "obor.02", "name": "Cizí jazyky – obecné"},
    {"code": "obor.03", "name": "Angličtina"},
    {"code": "obor.04", "name": "Němčina"},
    {"code": "obor.05", "name": "Primární vzdělávání"},
    {"code": "obor.06", "name": "Tělesná výchova"},
    {"code": "obor.07", "name": "Hudební výchova"},
    {"code": "obor.08", "name": "Výtvarná výchova"},
    {"code": "obor.09", "name": "Dramatická výchova"},
    {"code": "obor.10", "name": "Dějepis"},
    {"code": "obor.11", "name": "Společenské vědy"},
    {"code": "obor.12", "name": "Občanská výchova a etika"},
    {"code": "obor.13", "name": "Ochrana obyvatelstva"},
    {"code": "obor.14", "name": "Mediální výchova"},
    {"code": "obor.15", "name": "Speciální pedagogika – obecná"},
    {"code": "obor.16", "name": "Speciální pedagogika – specializace"},
    {"code": "obor.17", "name": "Ostatní"},
]


def seed_db() -> None:
    db: Session = SessionLocal()
    try:
        db.execute(text("CREATE SCHEMA IF NOT EXISTS keycloak;"))

        if db.query(CourseBlock).count() == 0:
            db.add_all([CourseBlock(**row) for row in COURSE_BLOCKS])

        if db.query(CourseTarget).count() == 0:
            db.add_all([CourseTarget(**row) for row in COURSE_TARGETS])

        if db.query(CourseSubject).count() == 0:
            db.add_all([CourseSubject(**row) for row in COURSE_SUBJECTS])

        if db.query(CourseRequirement).count() == 0:
            db.add_all([CourseRequirement(**row) for row in COURSE_REQUIREMENTS])

        if db.query(CourseEqfLevel).count() == 0:
            db.add_all([CourseEqfLevel(**row) for row in COURSE_EQF_LEVELS])

        if db.query(CourseLevel).count() == 0:
            db.add_all([CourseLevel(**row) for row in COURSE_LEVELS])

        if db.query(CourseType).count() == 0:
            db.add_all([CourseType(**row) for row in COURSE_TYPES])

        if db.query(NeuroPrinciple).count() == 0:
            db.add_all([NeuroPrinciple(**row) for row in NEURO_PRINCIPLES])

        if db.query(CrossSubject).count() == 0:
            db.add_all([CrossSubject(**row) for row in CROSS_SUBJECTS])

        if db.query(BloomLevel).count() == 0:
            db.add_all([BloomLevel(**row) for row in BLOOM_LEVELS])

        if db.query(KrauuCompetence).count() == 0:
            areas: dict[str, KrauuCompetence] = {}
            for row in KRAUU_COMPETENCES:
                if row["code"].endswith(".0"):
                    area = KrauuCompetence(**row)
                    db.add(area)
                    areas[row["code"]] = area
            db.flush()
            for row in KRAUU_COMPETENCES:
                if not row["code"].endswith(".0"):
                    area_code = f"{row['code'].split('.')[0]}.0"
                    db.add(
                        KrauuCompetence(**row, parent_id=areas[area_code].krauu_id)
                    )

        if db.query(SystemSetting).count() == 0:
            db.add_all([SystemSetting(**row) for row in SYSTEM_SETTINGS])

        db.commit()
    finally:
        db.close()
