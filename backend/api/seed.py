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
            "Na základě následujícího obsahu vytvoř strukturovaný vzdělávací kurz.\n\n"
            "INSTRUKCE - STRUKTURA KURZU:\n"
            "1. Rozděl obsah do logických modulů\n\n"
            "INSTRUKCE - STRUKTURA MODULU:\n"
            "Pro každý modul:\n"
            "- title: Výstižný název modulu (1-200 znaků)\n"
            "- learn_blocks: Přesně JEDEN učební blok (seznam s jedním prvkem), který má:\n"
            "  * content: Kompletní text veškeré látky modulu k naučení (detailní vysvětlení tématu v markdown formátu)\n"
            "- practice_questions: Seznam otázek (2 uzavřené + 1 otevřená)\n\n"
            "INSTRUKCE - STRUKTURA OTÁZEK:\n"
            "Pro každou otázku specifikuj:\n"
            '- question_type: "closed" pro uzavřené nebo "open" pro otevřené\n'
            "- question: Text otázky\n\n"
            'Pro UZAVŘENÉ otázky (question_type="closed"):\n'
            "- correct_answer: text správné odpovědi (musí přesně odpovídat textu jedné z closed_options). A nesmí být prázdné.\n"
            "- closed_options: Seznam 3 možností, kde každá má:\n"
            "  * text: Text odpovědi\n\n"
            'Pro OTEVŘENÉ otázky (question_type="open"):\n'
            "- example_answer: Příklad správné odpovědi. NESMÍ být prázdné.\n"
            "- open_keywords: Seznam klíčových slov/bodů, které by měla odpověď obsahovat:\n"
            "  * keyword: Klíčové slovo nebo bod\n\n"
            "Všechny otázky musí ověřovat pochopení látky z learn_blocks.\n"
            "Všechno bude bez formátování, pouze čistý text. žádný markdown, žádné odrážky, pouze strohý text.\n"
            "Vytvoř kurz v českém jazyce."
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
