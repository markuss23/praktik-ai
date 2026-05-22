from sqlalchemy.orm import Session
from sqlalchemy import text

from api.database import SessionLocal
from api.models import CourseBlock, CourseSubject, CourseTarget, SystemSetting

COURSE_BLOCKS: list[dict[str, str]] = [
    {"code": "a", "name": "Kontext", "description": "Porozumění principům AI"},
    {"code": "b", "name": "Transformace", "description": "Redesign výuky a hodnocení"},
    {"code": "c", "name": "Aplikace", "description": "Oborové kurzy"},
]

COURSE_TARGETS: list[dict[str, str]] = [
    {"code": "a", "name": "Akademik", "description": "Vysokoškolský pedagog"},
    {
        "code": "s",
        "name": "Student",
        "description": "Student učitelství / teacher trainee",
    },
    {"code": "m", "name": "Mentor", "description": "Fakultní učitel / mentor praxe"},
    {"code": "h", "name": "Host", "description": "Externí účastník"},
]

SYSTEM_SETTINGS: list[dict[str, str]] = [
    {
        "key": "course_summarizer",
        "name": "Sumarizátor kurzu",
        "model": "gpt-5.2",
        "prompt": (
            "Analyzuj následující obsah a vytvoř strukturovaný souhrn "
            "optimalizovaný pro vytvoření vzdělávacího kurzu.\n\n"
            "INSTRUKCE:\n"
            "1. Identifikuj hlavní tematické celky, které lze rozdělit do samostatných modulů. "
            "Pokud obsah pokrývá méně témat, rozděl dostupný obsah na logické části bez vymýšlení nového obsahu.\n"
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
    {"code": "01", "name": "Český jazyk a literatura"},
    {"code": "02", "name": "Cizí jazyky – obecné"},
    {"code": "03", "name": "Angličtina"},
    {"code": "04", "name": "Němčina"},
    {"code": "05", "name": "Primární vzdělávání"},
    {"code": "06", "name": "Tělesná výchova"},
    {"code": "07", "name": "Hudební výchova"},
    {"code": "08", "name": "Výtvarná výchova"},
    {"code": "09", "name": "Dramatická výchova"},
    {"code": "10", "name": "Dějepis"},
    {"code": "11", "name": "Společenské vědy"},
    {"code": "12", "name": "Občanská výchova a etika"},
    {"code": "13", "name": "Ochrana obyvatelstva"},
    {"code": "14", "name": "Mediální výchova"},
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

        if db.query(SystemSetting).count() == 0:
            db.add_all([SystemSetting(**row) for row in SYSTEM_SETTINGS])

        db.commit()
    finally:
        db.close()
