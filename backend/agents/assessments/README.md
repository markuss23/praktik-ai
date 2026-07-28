# Interakční formáty (assessments) — jak to celé funguje

Tenhle dokument je napsaný tak, aby dal smysl i bez znalosti zbytku kódu.
Cílem je, aby sis po přečtení dokázal odpovědět na otázku „kde přesně by se
psala logika pro nový formát testu?" a věděl proč je to rozdělené zrovna
takhle.

## Co to vůbec je

Systém na testování/procvičování studentů v kurzu. Lektor si na kurzu nebo
modulu **zapne formát** (zatím jediný existující: uzavřené otázky), nastaví
ho (napíše otázky, práh úspěšnosti...) a studenti ho pak plní. Je navržený
tak, aby šlo **přidat úplně nový typ testu** (otevřené otázky s AI
hodnocením, sokratický dialog...) tak, že se napíše nový balíček vedle
`closed_questions/` — beze změny API endpointů, databázových tabulek nebo
routerů. Proto je všechno rozdělené na **obecnou kostru** (tenhle README,
`base.py`, `schemas.py`, `api/src/assessments/`) a **konkrétní formát**
(`closed_questions/`).

## Tři vrstvy dat — a proč jsou tři

```
assessment_type      co systém vůbec umí (katalog formátů)
        │
course_assessment    co si lektor zapnul a nastavil na SVÉM kurzu/modulu
        │
assessment_session    konkrétní běh JEDNOHO studenta
        │
assessment_turn        jeden tah v tom běhu (jedna odpověď, jedna zpráva...)
```

Každá vrstva se mění jinou rychlostí a z jiného důvodu:

- **`assessment_type`** (`api/models.py`) — statický katalog. Řádek přibude,
  jen když naprogramuješ nový formát a přidáš ho do `ASSESSMENT_TYPES`
  v `api/seed.py`. Dneska tam je jeden řádek: `"closed_questions"`.
- **`course_assessment`** — lektor přes API řekne „na tomhle kurzu/modulu
  chci uzavřené otázky, tady jsou" (`POST /courses/{id}/assessments`).
  Jeden řádek = jedno zapnutí formátu na jednom místě v kurzu.
- **`assessment_session`** — vznikne, když student klikne „začít test"
  (`POST /course-assessments/{id}/sessions`). Jeden řádek na jeden pokus
  studenta o ten test.
- **`assessment_turn`** — jeden řádek na každou jednotlivou odpověď/zprávu
  uvnitř session. Slouží k rekonstrukci stavu a jako audit log.

Modely všech čtyř tabulek jsou v `api/models.py` (hledej sekci
„Interakční formáty (assessments)"), enumy (`AssessmentContext`,
`AssessmentSessionStatus`, `AssessmentTurnRole`) v `api/enums.py`.

## Jak vypadá jeden request od začátku do konce

Tohle je nejdůležitější část k pochopení — je to pořád **ten samý** tok,
ať už jde o uzavřené otázky nebo (jednou v budoucnu) cokoli jiného:

```
router (generický)  →  controller (generický)  →  REGISTRY[type_code]  →  service (typový)
api/src/assessments/routers.py    agents/assessments/base.py    agents/assessments/closed_questions/service.py
                     api/src/assessments/controllers.py
```

- **Router** (`api/src/assessments/routers.py`) — jen HTTP obálka. Přijme
  request, zavolá funkci v controlleru, nic víc.
- **Controller** (`api/src/assessments/controllers.py`) — sdílená
  mechanika: kdo smí co dělat (autorizace), kdy založit/najít session,
  kdy commitnout do DB. **O jednotlivých formátech neví vůbec nic** — jen
  podle `assessment_type_code` najde v registru dict formátu a zavolá
  stejné tři funkce (`start`, `handle_turn`, `current_view`), ať je to
  jakýkoli formát.
- **Service** (`agents/assessments/closed_questions/service.py`) — veškerá
  logika konkrétního formátu. Tady žije „jak vybrat otázky", „jak
  vyhodnotit odpověď", „kdy je to splněno".

### Konkrétně na příkladu uzavřených otázek

1. **Lektor zapne formát**: `POST /courses/{id}/assessments`. Controller
   (`create_course_assessment`) ověří vlastnictví kurzu, zkontroluje že
   `assessment_type_code` existuje v katalogu a že `settings` (otázky,
   práh, počet pokusů) projdou validací proti Pydantic schématu toho
   formátu (`ClosedQuestionsSettings`). Uloží se řádek do `course_assessment`.

2. **Student založí session**: `POST /course-assessments/{id}/sessions`.
   Controller (`start_session`) ověří, že student smí (zapsaný v kurzu,
   formát zapnutý), založí `AssessmentSession` řádek se
   **zmrazenou kopií** nastavení (`settings_snapshot` = kopie
   `course_assessment.settings` v tomhle okamžiku — pozdější úprava
   nastavení lektorem už rozjetou session neovlivní), a zavolá
   funkci `start(db, session)` z `closed_questions/service.py`. Ta si
   zamíchá pořadí otázek, uloží ho do `session.result` a vrátí první
   otázku.

3. **Student odpovídá**: `POST /assessment-sessions/{id}/turns`. Controller
   (`submit_turn`) ověří že session běží, zavolá funkci
   `handle_turn(db, session, turn)`. Ta vyhodnotí odpověď, zapíše tah, a
   buď vrátí další otázku, nebo (došly otázky) spočítá skóre a session
   končí.

4. **Obnova po refreshi**: `GET /course-assessments/{id}/sessions/current`.
   Zavolá se `current_view()`, která **jen čte** z DB (`session.result` +
   `settings_snapshot`) a znovu poskládá tu samou obrazovku — server si
   mezi requesty nic nepamatuje v paměti, funguje to i po restartu serveru
   nebo za víc workery.

Server si tedy vždycky celý stav rekonstruuje z DB — nikdy nic nedrží
„v hlavě" mezi dvěma requesty od stejného studenta.

## `base.py` a registr — jak to drží pohromadě (bez tříd)

Žádné dědění, žádný `ABC`, žádný dekorátor. Formát je **obyčejný Python
modul** se třemi funkcemi a jedním Pydantic schématem vedle nich:

```python
# takhle vypadá "kontrakt" formátu — žádná třída to nevynucuje,
# je to jen dohoda, co má modul formátu obsahovat
def start(db, session) -> TurnResult: ...
def handle_turn(db, session, turn) -> TurnResult: ...
def current_view(session) -> AssessmentView: ...
```

Každá z těch funkcí dostane `db` (DB session na `db.add(...)`) a `session`
(řádek `AssessmentSession` z DB) jako **obyčejné argumenty** — žádné
`self`, žádný skrytý stav. Vidíš přesně, s čím funkce pracuje, protože je
to vypsané v její hlavičce.

Tři sdílené pomocné funkce v `base.py`, které formát může použít (a
`closed_questions/service.py` je používá):

- `add_turn(db, session, role, content, payload)` — zapíše řádek do
  `assessment_turn`.
- `update_result(session, **changes)` — přepíše `session.result`
  **novým** dictem (JSONB sloupec bez extra nastavení nezaznamená
  `result["x"] = 1`, proto se vždycky musí přiřadit celý nový dict).
- `get_settings(session, settings_schema)` — vezme `session.settings_snapshot`
  (syrový dict z DB) a zvaliduje ho přes `settings_schema`, takže dál
  pracuješ s typovaným objektem (`cfg.pass_threshold`), ne s
  `dict["pass_threshold"]`. `closed_questions/service.py` si na to nahoře
  drží krátkou zkratku `_cfg(session)`.

### Registr — obyčejný dict, vyplněný ručně

```python
# base.py
REGISTRY: dict[str, dict] = {}
```

Klíč = kód formátu (`"closed_questions"`). Hodnota = dict se čtyřmi
věcmi — Pydantic schéma nastavení + tři funkce formátu. Vyplňuje se
**ručně**, žádná magie při importu:

```python
# agents/assessments/__init__.py
from agents.assessments.base import REGISTRY
from agents.assessments.closed_questions import service as closed_questions_service
from agents.assessments.closed_questions.settings import ClosedQuestionsSettings

REGISTRY["closed_questions"] = {
    "settings_schema": ClosedQuestionsSettings,
    "start": closed_questions_service.start,
    "handle_turn": closed_questions_service.handle_turn,
    "current_view": closed_questions_service.current_view,
}
```

To je celý registr. Žádný dekorátor, který by se „potají" spustil při
importu — je to jeden čitelný dict literal, co vidíš celý najednou. Nový
formát = další takový blok pod tím stávajícím.

Controller pak dostane string `"closed_questions"` z DB (sloupec
`assessment_type_code`) a zavolá `get_format("closed_questions")`
(`base.py`), což vrátí ten dict — a z něj si vezme, kterou funkci potřebuje:
`fmt["start"](db, session)`, `fmt["current_view"](session)` atd. Controller
tak nikdy nemusí vědět, že `closed_questions` vůbec existuje jako modul —
jen sáhne do dictu podle stringu.

## `api/src/assessments/` — generická API vrstva do detailu

Tahle sekce jde do hloubky přesně tam, kam se v „Jak vypadá jeden request"
jen ukazovalo prstem. Tři soubory, tři jasně oddělené role:

```
routers.py     — HTTP adresy a metody (GET/POST/...), nic víc
controllers.py — VEŠKERÁ sdílená logika (auth, lifecycle, DB commit)
schemas.py     — tvar dat, co chodí dovnitř/ven (Pydantic)
```

Žádný z těchto tří souborů **neví**, že existuje `closed_questions` — jediné
místo, kde se to spojí, je `get_format(session.assessment_type_code)`
uvnitř controlleru.

### `schemas.py` — pět tříd, rozdělených podle toho, kdo je posílá/dostává

| třída | směr | k čemu |
|---|---|---|
| `AssessmentTypeResponse` | server → klient | jeden řádek katalogu formátů |
| `CourseAssessmentResponse` | server → klient | konfigurace formátu na kurzu (co vrátí GET/POST/PATCH) |
| `CourseAssessmentCreateRequest` | klient → server | tělo `POST /courses/{id}/assessments` |
| `CourseAssessmentUpdateRequest` | klient → server | tělo `PATCH /course-assessments/{id}` (všechna pole `None` = nezaslané, nezměnit) |
| `SessionStateResponse` | server → klient | odpověď VŠECH runtime endpointů — `{session_id, status, view}` |

Všimni si, že `settings`/`default_settings` jsou všude `dict`, nikdy typ
konkrétního formátu — to je záměrně probrané výš v „Časté zádrhele".
`TurnInput`/`AssessmentView` se sem jen **reexportují** z
`agents/assessments/schemas.py` (řádek `from agents.assessments.schemas
import AssessmentView, TurnInput`) — je to totiž kontrakt formátu, ne
něco, co si `api/src` vymýšlí samo.

### `routers.py` — devět endpointů, tři skupiny

```
Katalog:                GET  /assessment-types

Konfigurace (lektor):   GET    /courses/{course_id}/assessments
                        POST   /courses/{course_id}/assessments        [jen lector+]
                        PATCH  /course-assessments/{id}                [jen lector+]
                        DELETE /course-assessments/{id}                [jen lector+]

Runtime (student):      POST /course-assessments/{id}/sessions
                        GET  /course-assessments/{id}/sessions/current
                        POST /assessment-sessions/{id}/turns
                        GET  /assessment-sessions/{id}
```

Každá funkce v `routers.py` má stejný tvar: vezme parametry z URL/těla,
zavolá **jednu** odpovídající funkci v `controllers.py` a rovnou vrátí
její výsledek. `dependencies=[require_role("lector")]` u zápisových
endpointů konfigurace znamená „FastAPI tenhle request rovnou odmítne (403),
pokud přihlášený uživatel nemá roli aspoň `lector`" — **předtím**, než se
vůbec dostane do controlleru. Runtime endpointy (`sessions`, `turns`)
žádný `require_role` nemají — tam autorizaci (zápsaný student / vlastník
kurzu) řeší až controller, protože „smím spustit test" není otázka role,
ale konkrétního vztahu k tomu kurzu (zápis, vlastnictví).

### `controllers.py` — kde se to všechno reálně děje

Rozděl si to na **veřejné funkce** (volá je router, jedna na endpoint) a
**privátní pomůcky** (začínají `_`, volají se navzájem mezi veřejnými
funkcemi).

**Privátní pomůcky — pochop tyhle první, zbytek pak dává smysl samo:**

- `_get_format(session)` — vezme řádek `AssessmentSession`, přes
  `get_format(session.assessment_type_code)` (`base.py`) najde v registru
  dict formátu (`{"settings_schema": ..., "start": ..., "handle_turn": ...,
  "current_view": ...}`). Tohle je jediné místo v celém `api/src`, kde se
  `controllers.py` dotkne světa formátů — a dotkne se ho jen přes string
  kód, ne přímým importem.
- `_session_state(session, fmt)` — poskládá `SessionStateResponse`
  zavoláním `fmt["current_view"](session)`. Používají ho všechny čtyři
  runtime funkce, co vrací aktuální stav session.
- `_apply_turn_result(session, status)` — po zavolání `fmt["start"](...)`
  nebo `fmt["handle_turn"](...)` **controller** (ne formát!) zapíše nový
  `session.status` a případně `finished_at`. Proč to nedělá funkce
  formátu? Viz komentář v `base.py` — formát smí jen navrhovat změny,
  commit a přechody stavu drží controller pohromadě, aby jeden tah byl
  vždycky jedna atomická transakce.
- `_get_runnable_course_assessment(...)` — než student vůbec může
  spustit session, zkontroluje se: formát je `is_enabled`, kurz je
  `approved`/`archived`, student je zapsaný (`check_enrollment`, s
  výjimkou pro vlastníka kurzu — ten si to smí zkusit bez zápisu).
- `_find_active_session(...)` — najde studentovu **rozjetou** (ne
  dokončenou) session na daný `course_assessment_id`, pokud existuje.
  Používá se na dvou místech: idempotence při startu a při obnově UI.
- `_get_own_session(db, user, session_id)` — najde session podle ID a
  ověří, že patří přihlášenému uživateli (404 pro cizí i pro neexistující
  — schválně stejná chyba, ať nikdo nezjistí cizí session_id zkoušením).

**Veřejné funkce — jedna na endpoint:**

- `list_assessment_types` — celý katalog, žádná autorizace navíc (jen
  přihlášení, to hlídá `CurrentUser` v routeru).
- `list_course_assessments` — vlastník/superadmin vidí i vypnuté formáty,
  běžný student jen `is_enabled=True` (a musí být zapsaný).
- `create_course_assessment` — nejdelší funkce, protože validuje nejvíc
  věcí najednou: vlastnictví kurzu → formát existuje v katalogu → kontext
  je pro něj povolený → `context`/`module_id` si navzájem sedí → `settings`
  projdou validací formátu (`validate_settings`, viz `base.py`). Teprve
  po všem tomhle se řádek uloží.
- `update_course_assessment` / `delete_course_assessment` — kratší
  varianty téhož; `delete` je **soft delete** (`course_assessment.soft_delete()`
  nastaví `is_active=False`), rozjeté/dokončené sessions studentů
  zůstávají v DB beze změny.
- `start_session` — idempotentní (druhé zavolání vrátí tu samou rozjetou
  session, nezaloží druhou), založí `AssessmentSession` se
  `settings_snapshot`, zavolá `fmt["start"](db, session)`, uloží výsledek.
- `submit_turn` — než cokoli zavolá, ověří `session.status ==
  in_progress` (409, pokud ne — session, co skončila nebo čeká na
  hodnocení, už žádný tah nepřijme), pak `fmt["handle_turn"](db, session, body)`.
- `get_session_state` / `get_current_session` — jen čtení, žádná
  DB mutace, přímo zavolají `_session_state`.

Všimni si vzorce opakujícího se ve `start_session` i `submit_turn`:

```python
try:
    result = fmt["handle_turn"](db, session, body)   # nebo fmt["start"](db, session)
except ValueError as e:
    db.rollback()
    raise HTTPException(status_code=400, detail=str(e)) from e

_apply_turn_result(session, result.status)
db.commit()
```

Funkce formátu smí vyhodit `ValueError` s česky psanou hláškou (např.
„Formát 'Uzavřené otázky' nepodporuje tah 'answer'") — controller ji
chytí, **vrátí zpátky všechno, co formát případně stihl přidat do DB
session** (`db.rollback()`), a přemění na 400 s tou hláškou. Jakákoli
jiná výjimka (typo v kódu, atd.) controllerem prochází neošetřená a
skončí jako obecná 500 (`api/main.py`) — schválně, protože to by byla
chyba na naší straně, ne něco, co má smysl hezky ukázat studentovi.

Poznámka k `async`/`await`: nikde v tomhle systému dnes není potřeba —
`closed_questions` nedělá žádné volání ven (žádné LLM, žádné síťové
volání), takže všechno (routery, controller, formát) je obyčejný
synchronní kód. Až jednou přibude formát s LLM voláním (`await
llm.ainvoke(...)`), přibude `async`/`await` jen tomu formátu a těm
konkrétním místům v controlleru, co ho volají — ne dřív, není důvod tu
komplikaci mít, dokud ji nic nepotřebuje.

## Formát `closed_questions` — jediný, co dnes existuje

Soubory: `closed_questions/settings.py` (nastavení), `closed_questions/service.py`
(logika). Bez LLM — všechno je deterministické.

**Nastavení** (`ClosedQuestionsSettings`):

```json
{
  "questions": [
    {"question": "Kolik je 2+2?", "options": ["3", "4", "5"], "correct_index": 1}
  ],
  "num_questions": null,
  "shuffle_options": true,
  "max_attempts": 3,
  "pass_threshold": 0.75
}
```

**Průběh** (tři funkce v `closed_questions/service.py`):

1. `start()` — ze všech otázek lektora vybere (případně jen `num_questions`
   kusů) a zamíchá pořadí; pro každou vybranou otázku zamíchá i pořadí
   možností. Obojí uloží do `session.result`, aby refresh stránky
   nevylosoval jiné zadání.
2. `handle_turn()` — na každou otázku má student `max_attempts` pokusů:
   - **správně** → otázka hotová, jde se na další ze zásobníku,
   - **špatně, pokusy zbývají** → zůstává na **té samé** otázce, žádný
     posun,
   - **špatně na poslední pokus** → otázka se počítá jako nesplněná, ale
     **i tak** se jde na další (nevrací se k ní později).
   Správná odpověď se studentovi **nikdy** neprozradí, ani po vyčerpání
   pokusů.
3. Po poslední otázce v zásobníku: skóre = (počet otázek zvládnutých
   v rámci pokusů) / (celkový počet otázek), porovná se s
   `pass_threshold` → `passed`/`failed`.

## Časté zádrhele (na co jsme sami narazili)

- **`settings` v generickém API je vždycky `dict`, nikdy `ClosedQuestionsSettings`.**
  `api/src/assessments/schemas.py` (katalog, konfigurace) musí zůstat
  obecné napříč všemi budoucími formáty — nemůže vědět dopředu, jaký tvar
  settings má zrovna tenhle konkrétní formát mít. Typované parsování se
  děje **až uvnitř formátu** přes `get_settings(session, ClosedQuestionsSettings)`
  (zkratka `_cfg()` v `closed_questions/service.py`). (Jednou jsme si to
  tady omylem přepsali na `ClosedQuestionsSettings` a spadl na tom
  katalogový endpoint.)
- **Tenhle systém původně používal třídy** (`BaseAssessmentService(ABC)`,
  dědičnost, dekorátor `@register`). Přepsali jsme ho na obyčejné funkce
  a plain `dict` registr, protože pro jeden formát a jednoduchou logiku
  to bylo zbytečně moc konceptů najednou (abstraktní třídy, `ClassVar`,
  dekorátory). Chování je 1:1 stejné — jen se to teď čte shora dolů jako
  obyčejné funkce s explicitními argumenty (`db`, `session`), ne jako
  metody na objektu se skrytým `self`.
- **`default_settings` v katalogu je schválně prázdné** (`{"questions": []}`)
  a neprojde vlastní validací formátu. Je to záměr — donutí to lektora
  při zapnutí formátu vyplnit `settings` sám, `null`/vynechání nestačí.
- **`session.result["klíč"] = hodnota` se tiše neuloží.** JSONB sloupec bez
  `MutableDict` nesleduje in-place změny. Vždycky přes `update_result()`.
- **Postgres neumí přidat hodnotu do existujícího enum typu přes
  `create_all`** (chtělo by to ruční `ALTER TYPE`). Proto `AssessmentSessionStatus`
  a `AssessmentTurnRole` mají už teď definované i hodnoty, které
  `closed_questions` nikdy nepoužije (`awaiting_review`, `reviewer`) —
  jsou tam pro budoucí formáty s hodnocením člověkem, aby se jednou
  nemusela dělat bolestivá migrace enumu.
- **`is_required` na `CourseAssessment` se dnes nikde nevyhodnocuje.** Je
  to připravené pole pro budoucí „počítá se do dokončení kurzu", ale
  žádná logika se na něj zatím nedívá.
- **`current_view()` kontroluje session i podle dat, ne jen podle
  `session.status`.** Když se `current` (pozice v zásobníku otázek)
  dostane na konec, bere se to jako hotovo, i kdyby se `status` z
  nějakého důvodu nestihl přepnout na `passed`/`failed` — ochrana proti
  neúplně zapsanému stavu.

## Co dnes záměrně chybí (a proč)

- **Jiné formáty** (otevřené otázky s AI hodnocením, AI generovaná
  cvičení...) — přidávají se stejným vzorem jako `closed_questions/`, ale
  zatím nejsou napsané. Existující starší funkce (`agents/assessment_generator`,
  `agents/practice_question_generator` a jejich API pod `/agents/...`)
  běží dál beze změny vedle tohohle systému.
- **Hodnocení formátu člověkem** (`awaiting_review` stav, review
  endpointy) — enum hodnoty jsou připravené, ale žádný formát je zatím
  nepoužívá.
- **Migrace databáze** — projekt nemá Alembic ani podobný nástroj. Nové
  tabulky se vytvoří samy přes `Base.metadata.create_all()` při startu
  (`api/database.py::init_db`). Stačí přidat model do `api/models.py`.
