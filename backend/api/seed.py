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

SYSTEM_SETTINGS: list[dict[str, str]] = [
    {
        "key": "course_summarizer",
        "name": "Sumarizátor kurzu",
        "model": "gpt-5.2",
        "prompt": (
            "Analyzuj následující obsah a vytvoř strukturovaný souhrn "
            "optimalizovaný pro vytvoření vzdělávacího kurzu.\n\n"
            "ZÁSADNÍ PRAVIDLO — ŽÁDNÉ HALUCINACE:\n"
            "Veškerý obsah souhrnu musí pocházet VÝHRADNĚ z poskytnutých zdrojových materiálů. "
            "Nepřidávej žádné informace, příklady ani vysvětlení, která nejsou explicitně ve zdrojích. "
            "Pokud zdroje neobsahují dostatek informací pro dané téma, zkrať nebo vypusť danou část "
            "místo vymýšlení obsahu.\n\n"
            "INSTRUKCE:\n"
            "1. Rozděl obsah do PŘESNĚ tolika tematických celků, kolik je uvedeno v poli POČET MODULŮ. "
            "Pokud obsah pokrývá méně témat, rozděl dostupný obsah na logické části tak, aby vznikl správný počet celků — bez vymýšlení nového obsahu.\n"
            "2. Pro každý tematický celek extrahuj:\n"
            "- Klíčové koncepty a pojmy k naučení\n"
            "- Praktické příklady a ukázky\n"
            "- Fakta vhodná pro testové otázky (ABC)\n\n"
            "3. Výstup strukturuj takto:\n\n"
            "TÉMA 1: [název tématu]\n"
            "- Klíčové koncepty: [seznam pojmů a definic]\n"
            "- Látka k naučení: [detailní vysvětlení]\n"
            "- Testovatelná fakta: [konkrétní informace pro otázky]\n\n"
            "TÉMA 2: [název tématu]\n"
            "...\n\n"
            "4. Zachovej odbornou terminologii a přesné definice\n"
            "5. Maximální délka: 4000 znaků\n"
            "6. Piš v češtině, bez markdown formátování"
        ),
        "description": "LLM pro sumarizaci zdrojového obsahu kurzu před generováním modulů.",
    },
    {
        "key": "course_planner",
        "name": "Plánovač kurzu",
        "model": "gpt-5.4",
        "prompt": (
            """
            Na základě následujícího obsahu vytvoř strukturovaný vzdělávací kurz.
            OBECNÁ PRAVIDLA:
            - Veškerý textový výstup (názvy, otázky, odpovědi, klíčová slova) bude čistý prostý text bez jakéhokoliv formátování.
            - Výjimkou je pouze pole content v learn_blocks, kde se používají základní HTML tagy pro strukturování textu.
            - Kurz vytvoř v českém jazyce.
            - Používej pouze fakta obsažená v dodaných materiálech. Pokud něco v materiálech chybí nebo není jednoznačné, nevymýšlej si — upozorni na to opatrnou formulací.

            STRUKTURA KURZU:
            Rozděl obsah do logických modulů. Každý modul musí mít přesně tuto strukturu:

            title: [Výstižný název modulu, 1–200 znaků]

            perex: [Krátká anotace modulu, max 255 znaků. Shrnuje v 1–2 větách, co se student v modulu naučí a proč je to užitečné. Prostý text bez formátování.]

            neuro_principle_code: [Kód PŘESNĚ JEDNOHO neurovědního principu ze seznamu níže, který se pro pedagogický design tohoto modulu hodí nejvíce. Uveď pouze kód, např. "NP-01".

            SEZNAM NEUROVĚDNÍCH PRINCIPŮ (vyber jeden kód na modul):
            NP-01 Neuroplasticita — Opakované učení mění strukturu synaptických sítí v mozku
            NP-02 Distribuované opakování — Učení rozložené v čase vede k trvalejšímu zapamatování
            NP-03 Aktivní vybavování — Vědomé vybavování z paměti posiluje stopu víc než pasivní čtení
            NP-04 Žádoucí obtíže — Mírná obtížnost a kognitivní zápas prohlubují zpracování a transfer
            NP-05 Prokládání — Střídání různých typů úloh podporuje rozlišování konceptů
            NP-06 Duální kódování — Kombinace verbální a vizuální reprezentace vytváří dvě paměťové stopy
            NP-07 Kognitivní zátěž — Pracovní paměť má kapacitu cca 4 ± 1 prvků; přetížení blokuje učení
            NP-08 Elaborativní kódování — Propojení nové informace s existujícími znalostmi tvoří síť asociací
            NP-09 Efekt generování — Sám vytvořená informace se pamatuje lépe než pasivně přijatá
            NP-10 Testovací efekt — Samotné testování konsoliduje dlouhodobou paměť silněji než čtení
            NP-11 Predikční chyba — Dopaminový systém reaguje na rozdíl mezi očekáváním a realitou
            NP-12 Konsolidace ve spánku — Spánek přepisuje paměťové stopy z hipokampu do neokortexu
            NP-13 Pozornost a pracovní paměť — Bez selektivní pozornosti nedochází ke kódování
            NP-14 Slučování do bloků — Sdružování informací do smysluplných bloků zvyšuje kapacitu paměti
            NP-15 Metakognice — Schopnost přemýšlet o vlastním myšlení a sledovat porozumění
            NP-16 Zrcadlové neurony — Pozorování postupu druhého aktivuje stejné okruhy jako vlastní provádění
            NP-17 Stav plynutí (flow) — Optimální poměr výzvy a dovednosti maximalizuje zapojení a učení
            NP-18 Okamžitá zpětná vazba — Rychlá konkrétní zpětná vazba umožní opravit chybu dřív než se zafixuje
            NP-19 Vtělené poznávání — Tělesné zapojení (gesta, řeč nahlas, kreslení) posiluje zpracování
            NP-20 Schémata — Nové informace se snáze ukládají při napojení na existující schéma
            ]

            krauu_competence_codes: [Seznam kódů KRAUU kompetencí (MŠMT 2023) ze seznamu níže, které modul rozvíjí. Vyber 1–3 nejrelevantnější kompetence. Uváděj pouze kódy kompetencí (např. "1.1", "2.4"), nikdy kódy oblastí končící ".0".

            SEZNAM KRAUU KOMPETENCÍ:
            Oblast 1 – Obsah a didaktika:
            1.1 Rozumí vyučovaným oborům a rozvíjí se v nich — Učitel/ka rozumí oborům, které vyučuje, a systematicky se v nich rozvíjí.
            1.2 Didakticky zprostředkovává obsah žákům — Zprostředkovává obsah žákům v souladu s jejich vzdělávacími potřebami.
            Oblast 2 – Plánování, vedení a reflexe výuky:
            2.1 Nastavuje cíle výuky — Stanovuje srozumitelné cíle a vede k jejich nastavování i žáky.
            2.2 Poznává vzdělávací potřeby a plánuje výuku — Plánuje výuku tak, aby každý žák mohl aktivně dosahovat cílů.
            2.3 Podporuje zvídavost a motivaci žáků — Podporuje u žáků zvídavost a motivaci k učení.
            2.4 Efektivně vede výuku a zjišťuje porozumění — Vede výuku efektivně, zjišťuje porozumění a reaguje na potřeby žáků.
            2.5 Reflektuje výuku — Reflektuje vlastní výuku a vyhodnocuje dosahování cílů.
            Oblast 3 – Prostředí pro učení:
            3.1 Vytváří bezpečné prostředí pro učení — Vytváří fyzicky i psychicky bezpečné prostředí pro učení.
            3.2 Vede žáky k chování podporujícímu učení — Vede žáky k chování podporujícímu vlastní učení i spolupráci.
            3.3 Uspořádání fyzického a digitálního prostředí — Zajišťuje vhodné uspořádání fyzického a digitálního prostředí učení.
            Oblast 4 – Zpětná vazba a hodnocení:
            4.1 Hodnotí na základě kritérií — Hodnotí žáky na základě jasných kritérií a vede k tomu i žáky.
            4.2 Poskytuje a přijímá zpětnou vazbu — Poskytuje žákům konstruktivní zpětnou vazbu a sám přijímá ZV od žáků.
            4.3 Vede žáky k reflexi jejich učení — Vede žáky k reflexi vlastního učení a samostatné metakognici.
            Oblast 5 – Profesní spolupráce:
            5.1 Spolupracuje s kolegy a kolegyněmi — Spolupracuje s kolegy ve prospěch žáků a společného profesního růstu.
            5.2 Spolupracuje s rodiči a širší komunitou školy — Spolupracuje s rodiči a širší komunitou v zájmu žáků.
            Oblast 6 – Profesní sebepojetí, rozvoj, etika a duševní zdraví:
            6.1 Utváření profesního sebepojetí a rozvoj — Systematicky pracuje na utváření profesního sebepojetí a vlastním rozvoji.
            6.2 Odpovědná práce s informacemi a demokratické hodnoty — Odpovědně pracuje s informacemi a digitálními nástroji, vede k etice.
            6.3 Duševní zdraví a psychohygiena — Systematicky pečuje o své duševní zdraví a psychohygienu.
            ]

            bloom_level_codes: [Seznam kódů úrovní Bloomovy taxonomie kognitivních cílů ze seznamu níže, kterým odpovídají výukové cíle modulu (podle toho, co student po modulu umí). Vyber 1–3 nejrelevantnější úrovně. Uváděj pouze číselné kódy, např. "2", "3".

            SEZNAM ÚROVNÍ BLOOMOVY TAXONOMIE:
            1 Zapamatovat — vyjmenuje, popíše, identifikuje, rozpozná, zopakuje
            2 Porozumět — vysvětlí, shrne, klasifikuje, interpretuje, přeloží
            3 Aplikovat — použije, provede, řeší, demonstruje, implementuje
            4 Analyzovat — porovná, rozliší, zhodnotí strukturu, rozloží, prozkoumá
            5 Hodnotit — posoudí, obhájí, kriticky zhodnotí, doporučí, zdůvodní
            6 Tvořit — navrhne, sestaví, vytvoří, zkonstruuje, naplánuje
            ]

            learn_blocks:
            - content: [
                Kompletní výklad látky daného modulu jako nový výukový text — ne shrnutí, ne opis zdroje.
                Pracuj jako zkušený pedagog: vyber podstatné informace, uspořádej je od nejjednodušších ke složitějším a vysvětli je s kontextem a příklady.

                ZÁVAZNÉ POŘADÍ OBSAHU:
                1. Proč je téma důležité a k čemu slouží.
                2. Jednoduché vysvětlení hlavní myšlenky, ideálně s analogií nebo příkladem.
                3. Klíčové pojmy — každý pojmenuj a vysvětli před tím, než ho začneš používat.
                4. Vztahy mezi pojmy, příčiny a důsledky.
                5. Praktický příklad nebo ukázka z praxe.
                6. Složitější nuance nebo časté omyly, pokud jsou v materiálech obsaženy.
                7. Krátké shrnutí toho nejdůležitějšího.

                PRAVIDLA PRO STYL VÝKLADU:
                - Vysvětluj souvislosti a ukazuj, proč informace dává smysl — nepřepisuj zdroj mechanicky.
                - Piš v krátkých odstavcích, věcně a srozumitelně. Vyhýbej se akademickému jazyku a dlouhým souvětím.
                - Pokud je pojem abstraktní, použij jednoduchou analogii. Vždy za ní doplň, kde analogie přestává platit.
                - Nezahlcuj studenta detaily příliš brzy. Nejdříve jednoduchý mentální model, pak detaily.

                ZASTAVENÍ PRO PŘEMÝŠLENÍ:
                Na vhodném místě vlož alespoň jedno zastavení pro studenta. Použij tag <blockquote> s konkrétní otázkou nebo úkolem, například:
                <blockquote>Zastav se a promysli: Jak bys vlastními slovy vysvětlil rozdíl mezi těmito dvěma pojmy?</blockquote>
                nebo
                <blockquote>Mini-aplikace: Zkus najít příklad tohoto principu z vlastní praxe.</blockquote>

                DOPORUČENÍ PRO AI ASISTENTA:
                Pokud je část látky náročnější nebo vhodná k dovysvětlení, vlož na konci bloku konkrétní doporučení, například:
                <blockquote>Pokud ti tento rozdíl není jasný, zeptej se AI asistenta: "Vysvětli mi [konkrétní pojem] na příkladu z praxe [obor studenta]."</blockquote>
                Nedávej obecnou výzvu. Vždy navrhni konkrétní otázku.

                POVOLENÉ HTML TAGY:
                <h2> pro hlavní nadpis tématu
                <h3> pro podnadpisy sekcí
                <p> pro odstavce s výkladem
                <ul> a <li> pro výčty a seznamy
                <ol> a <li> pro číslované kroky nebo pořadí
                <strong> pro zvýraznění klíčových pojmů
                <blockquote> pro zastavení, analogie a doporučení pro AI asistenta
                Žádné jiné tagy nepoužívej. Žádný markdown.
                ]

            practice_questions:
            [Každý modul musí mít PŘESNĚ 3 otázky: první dvě jsou uzavřené, třetí je otevřená. Žádná jiná kombinace není přijatelná.]

            Otázka 1 – uzavřená:
                question_type: closed
                question: [Text otázky]
                closed_options:
                - text: [Možnost A]
                - text: [Možnost B]
                - text: [Možnost C]
                correct_answer: [Musí být doslovně shodný s textem jedné z closed_options. Nesmí být prázdný.]

            Otázka 2 – uzavřená:
                question_type: closed
                question: [Text otázky]
                closed_options:
                - text: [Možnost A]
                - text: [Možnost B]
                - text: [Možnost C]
                correct_answer: [Musí být doslovně shodný s textem jedné z closed_options. Nesmí být prázdný.]

            Otázka 3 – otevřená:
                question_type: open
                question: [Text otázky]
                example_answer: [Příklad správné odpovědi. Nesmí být prázdný.]
                open_keywords:
                - keyword: [Klíčové slovo nebo bod 1]
                - keyword: [Klíčové slovo nebo bod 2]
                - keyword: [Klíčové slovo nebo bod 3]

            PRAVIDLA PRO OTÁZKY:
            - Všechny otázky musí ověřovat pochopení látky z learn_blocks daného modulu.
            - correct_answer musí být doslovně totožný s textem jedné ze tří closed_options.
            - example_answer a open_keywords nesmí být prázdné.
            - Počet otázek na modul je vždy přesně 3: 2 uzavřené, 1 otevřená. Nikdy více, nikdy méně.
                        
            """
        ),
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
