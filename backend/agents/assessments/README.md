# Interakční formáty (assessments)

Rozšiřitelný systém typů testování/procvičování v kurzech. Lektor si na kurzu
zapne formát (uzavřené otázky, formulace otázek, do budoucna sokratický dialog,
rubrika, artefakt...), nastaví ho a studenti ho procházejí formou „session
s tahy". **Přidání nového formátu nevyžaduje žádný nový endpoint, controller
ani DB tabulku** — jen nový balíček v tomto adresáři.

## Obsah

1. [Architektura v kostce](#architektura-v-kostce)
2. [Databázové schéma](#databázové-schéma)
3. [API endpointy](#api-endpointy)
4. [Životní cyklus session](#životní-cyklus-session)
5. [Kontrakt formátu (BaseAssessmentService)](#kontrakt-formátu)
6. [Existující formáty](#existující-formáty)
7. [Návod: jak přidat nový formát](#návod-jak-přidat-nový-formát)
8. [Frontend integrace](#frontend-integrace)
9. [Časté chyby a záludnosti](#časté-chyby-a-záludnosti)

---

## Architektura v kostce

Systém stojí na třech vrstvách dat (každá se mění jinou rychlostí) a jednom
registru chování:

```
┌─────────────────────┐   co systém umí (mění se s vývojem)
│ assessment_type     │   katalog formátů, seed.py
└─────────┬───────────┘
          │
┌─────────▼───────────┐   co si lektor zapnul a nastavil
│ course_assessment   │   konfigurace na kurzu/modulu, JSONB settings
└─────────┬───────────┘
          │
┌─────────▼───────────┐   běhy studentů (generuje provoz)
│ assessment_session  │──▶ assessment_turn (tah po tahu)
└─────────────────────┘

REGISTRY (agents/assessments/base.py)
  "closed_questions"     → ClosedQuestionsService
  "question_formulation" → QuestionFormulationService
```

Tok requestu:

```
router (generický)  →  controller (generický)  →  REGISTRY[type_code]  →  service (typový)
api/src/assessments/routers.py                     agents/assessments/<formát>/service.py
                    api/src/assessments/controllers.py
```

- **Router** — typovaná obálka, validace těla přes discriminated union.
- **Controller** — sdílená mechanika: autorizace, lifecycle session, commit.
  O typech nic neví, jen dispatchuje do registru.
- **Service** — veškerá typová logika (pravidla „hry"). Nemá vlastní stav
  mezi requesty — všechno rekonstruuje z DB.

Klíčové pravidlo pro rozdělení dat: **podle čeho se filtruje/joinuje/agreguje
→ sloupec; co se čte a zapisuje vcelku → JSONB** (validovaný Pydantic
schématem, nikdy „volný" dict).

## Databázové schéma

Modely: `backend/api/models.py`, sekce „Interakční formáty (assessments)".
Enumy: `backend/api/enums.py`.

### `assessment_type` — katalog

| sloupec | význam |
|---|---|
| `code` (PK) | kód formátu, musí odpovídat `type_code` service třídy |
| `name`, `description` | pro UI lektora |
| `allowed_contexts` | JSONB pole — kde smí být formát nasazen (`practice`, `assessment`, `course_final`) |
| `default_settings` | JSONB — předvyplnění formuláře lektora |

Seeduje se z `ASSESSMENT_TYPES` v `backend/api/seed.py`.
**Pozor:** seed plní tabulku jen pokud je prázdná — nový formát je potřeba
do existující DB doplnit ručně (INSERT), nebo seed upravit na doplňování po kódech.

### `course_assessment` — konfigurace lektora

| sloupec | význam |
|---|---|
| `course_id`, `module_id` | `module_id` je NULL pro `course_final`, povinný pro `practice`/`assessment` (vynuceno CHECK constraintem) |
| `context` | kde v kurzu formát běží |
| `is_enabled` | vypnutí bez mazání |
| `is_required` | počítá se splnění do dokončení kurzu (pro budoucí progress logiku) |
| `position` | pořadí v UI |
| `settings` | JSONB — typově specifické nastavení, **validované registrem před každým zápisem** |
| `settings_version` | rezerva pro budoucí evoluci schématu settings |

Unikátnost `(course, module, context, typ)` řeší **dva parciální indexy**
(jeden pro `module_id IS NOT NULL`, druhý pro NULL) — jeden index by kvůli
NULL unikátnost nevynutil.

### `assessment_session` — běh studenta

| sloupec | význam |
|---|---|
| `assessment_type_code` | denormalizovaný diskriminátor — dispatch bez joinu |
| `status` | `in_progress` / `awaiting_review` / `completed` / `passed` / `failed` / `abandoned` |
| `settings_snapshot` | **kopie settings v okamžiku startu** — změna konfigurace lektorem nerozbije rozběhnuté session |
| `result` | JSONB — pracovní stav formátu (vylosované téma, pořadí otázek, počet správných...) |
| `score`, `is_passed` | sdílená hodnoticí pole; NULL u formátů bez verdiktu |
| `finished_at` | nastavuje controller při přechodu do terminálního stavu |

Parciální unique index: jeden student má max. jednu „živou" session
(`in_progress`/`awaiting_review`) na konfiguraci.

Význam stavů:

- `completed` — dokončeno **bez verdiktu** (formulace otázek, dialog)
- `passed`/`failed` — formáty s prahem (uzavřené otázky, rubrika, artefakt)
- `awaiting_review` — čeká na hodnocení člověkem (připraveno pro rubriku)

### `assessment_turn` — zápis průběhu

Jeden tah = jeden řádek: `role` (`student`/`assistant`/`reviewer`/`system`),
`content` (text pro čtení člověkem), `payload` (JSONB — strojová data:
vybraná možnost, feedback, ...). Slouží k rekonstrukci stavu, auditu
a u konverzačních formátů jako historie dialogu.

## API endpointy

Vše v `api/src/assessments/routers.py`, mountováno pod `/api/v1`, povinná
autentizace. Tyto endpointy jsou **finální** — nové formáty je nemění.

### Katalog a konfigurace (lektor)

| metoda | cesta | kdo | popis |
|---|---|---|---|
| GET | `/assessment-types` | přihlášený | katalog formátů |
| GET | `/courses/{course_id}/assessments` | vlastník vidí vše, student jen `is_enabled` | konfigurace na kurzu |
| POST | `/courses/{course_id}/assessments` | lector+, vlastník kurzu | zapnutí formátu (201) |
| PATCH | `/course-assessments/{id}` | lector+, vlastník | úprava (jen zaslaná pole) |
| DELETE | `/course-assessments/{id}` | lector+, vlastník | soft delete (204), sessions studentů zůstávají |

Příklad create:

```json
POST /api/v1/courses/103/assessments
{
  "assessment_type_code": "closed_questions",
  "context": "course_final",
  "module_id": null,
  "is_required": true,
  "settings": { "questions": [ ... ], "pass_threshold": 0.75 }
}
```

Validace při create/update: formát existuje v katalogu → `context` je
v `allowed_contexts` → koherence context×module → **`settings` projdou
Pydantic schématem formátu** (jinak 422 s popisem chyby). `settings: null`
= použijí se `default_settings` z katalogu (ty jsou schválně „prázdné",
takže donutí lektora vyplnit obsah).

### Runtime (student)

| metoda | cesta | popis |
|---|---|---|
| POST | `/course-assessments/{id}/sessions` | start; **idempotentní** — rozběhnutá session se vrátí |
| GET | `/course-assessments/{id}/sessions/current` | živá session studenta (obnova UI po refreshi); 404 = žádná |
| POST | `/assessment-sessions/{id}/turns` | tah studenta |
| GET | `/assessment-sessions/{id}` | aktuální stav (rekonstruovaný z DB) |

### Review — hodnocení lektorem

| metoda | cesta | kdo | popis |
|---|---|---|---|
| GET | `/course-assessments/{id}/sessions?status=awaiting_review` | lector+, vlastník | fronta sessions k hodnocení |
| GET | `/assessment-sessions/{id}/review` | lector+, vlastník | podklad: odpovědi studenta + AI drafty (tahy) |
| POST | `/assessment-sessions/{id}/review` | lector+, vlastník | finální hodnocení (session musí být `awaiting_review`) |

Tělo hodnocení (`ReviewInput`): buď `items` — skóre+feedback po položkách
v pořadí zadání (celkové skóre se dopočítá průměrem), nebo rovnou celkové
`score`; volitelně `feedback` (zobrazí se studentovi ve výsledku)
a `is_passed` (explicitní přepis verdiktu vypočteného z prahu):

```json
POST /api/v1/assessment-sessions/33/review
{
  "items": [
    {"score": 90, "feedback": "Přesné a úplné."},
    {"score": 40, "feedback": "Chybí podstata minimalizace."}
  ],
  "feedback": "Celkově solidní, doplňte si kapitolu o ochraně dat."
}
```

Všechny runtime endpointy vracejí stejnou obálku:

```json
{
  "session_id": 33,
  "status": "in_progress",
  "view": { "kind": "closed_question", "question": "...", "options": ["...", "..."], ... }
}
```

### Dva různé `kind` — nezaměňovat!

- **`view.kind`** (server → klient): *co vykreslit* — `"closed_question"`,
  `"question_formulation"`, `"result"`.
- **`TurnInput.kind`** (klient → server): *co student dělá* — `"option"`,
  `"questions"`, `"finish"`.

Chyba `union_tag_invalid ... expected_tags: 'questions', 'finish', 'option'`
znamená, že jste do turn endpointu poslali view kind (nebo neexistující tah).

## Životní cyklus session

```
POST .../sessions ──▶ in_progress ──POST .../turns──▶ in_progress (další tah)
                                                          │
                                                          ├─▶ completed   (bez verdiktu)
                                                          ├─▶ passed      (score ≥ práh)
                                                          ├─▶ failed      (score < práh)
                                                          └─▶ awaiting_review
                                                                 │
                                                    POST .../review (lektor)
                                                                 │
                                                                 ▼
                                                          passed/failed
```

- Tah do session, která není `in_progress` → **409**.
- Neplatný tah v rámci formátu (špatný počet otázek, index mimo rozsah,
  nepodporovaný `kind`) → **400** s hláškou ze service (ValueError).
- Server mezi requesty nic nedrží v paměti — refresh/`GET` kdykoli
  zrekonstruuje obrazovku z `settings_snapshot` + `result` + tahů.
  Funguje přes libovolný počet workerů.

## Kontrakt formátu

`agents/assessments/base.py` — `BaseAssessmentService`:

```python
@register
class MujFormatService(BaseAssessmentService):
    type_code = "muj_format"                 # = assessment_type.code v katalogu
    settings_schema = MujFormatSettings      # Pydantic schéma pro settings

    async def start(self) -> TurnResult: ...
    async def handle_turn(self, turn: TurnInput) -> TurnResult: ...
    def current_view(self) -> AssessmentView: ...
```

| metoda | kdy se volá | co má dělat |
|---|---|---|
| `start()` | při vzniku session | inicializace (losování, výběr otázek), zápis do `result`, vrátit první view |
| `handle_turn(turn)` | každý tah studenta | zpracovat, uložit tahy, vrátit nový stav+view; na nepodporovaný tah `raise ValueError` |
| `current_view()` | GET stavu / obnova | čistě z DB zrekonstruovat obrazovku (bez side-effectů!) |

K dispozici: `self.db` (SQLAlchemy session), `self.session` (ORM
AssessmentSession), `self.settings` (zvalidovaný snapshot), helpery
`self.add_turn(role, content, payload)` a `self.update_result(**changes)`.

### Závazná pravidla pro service

1. **Commit dělá controller, ne service.** Service jen `db.add`/mutace
   objektů. Díky tomu je celý tah jedna transakce a chyba nic nezapíše.
2. **`session.result` měňte výhradně přes `update_result()`.** JSONB sloupec
   nesleduje in-place mutace — `session.result["x"] = 1` se **tiše neuloží**.
   Helper vždy přiřadí nový dict.
3. **Náhodné volby (téma, pořadí otázek) uložte do `result` hned při
   `start()`** — refresh nesmí vylosovat jiné zadání.
4. **Chybové stavy = `raise ValueError("česká hláška")`** — controller
   je převede na 400. Nevyhazujte HTTPException ze service.
5. **Do view nikdy nedávejte tajemství** (správné odpovědi, prahy...).
   View je přesně to, co uvidí klient. Správné odpovědi žijí jen
   v `settings_snapshot` na serveru.
6. **Verdikt zapisuje service** (`session.score`, `session.is_passed`),
   **status a `finished_at` zapisuje controller** z `TurnResult.status`.
7. LLM volání vždy přes `await llm.ainvoke(...)` (neblokovat event loop)
   a se **structured outputem** (`.with_structured_output(PydanticModel)`) —
   žádné ruční parsování textu. Konfigurace prompt/model přes
   `get_llm_config(db, klíč, default_model=..., default_prompt=...)`
   (tabulka `system_setting`, seed v `seed.py`).
8. Uživatelský text vkládaný do promptu ohraničte delimitery a v promptu
   uveďte, že jde o data, ne instrukce (obrana proti prompt injection).

## Existující formáty

### `closed_questions` — Uzavřené otázky (bez LLM)

Lektor autoruje otázky v settings; student je prochází po jedné s okamžitou
zpětnou vazbou; na konci skóre proti prahu → `passed`/`failed`.

```json
"settings": {
  "questions": [
    { "question": "Kolik je 2+2?", "options": ["3", "4", "5"], "correct_index": 1 }
  ],
  "num_questions": null,        // kolik se náhodně vybere; null = všechny
  "shuffle_options": true,      // míchat a/b/c per session
  "pass_threshold": 0.75        // podíl správných pro úspěch
}
```

Tahy: `{"kind": "option", "option_index": 0}` (index v **zobrazeném** pořadí —
backend si ho přemapuje přes permutaci uloženou v `result`).
Views: `closed_question` (otázka, možnosti, pořadí, `last_answer_correct`)
→ `result` (score, is_passed, zpráva).

### `ai_practice` — AI procvičování (plně AI vedené, jen kontext `practice`)

Nástupce personalizovaného practice (`UserPracticeQuestion` +
practice_question_generator/evaluator). Žádný autoring obsahu — otázky
(open/closed) se generují za běhu z learn blocků modulu a personalizují:

- **historie session** — neopakovat otázky, přednostně procvičovat, kde
  student chyboval (generátor dostává posledních 15 otázek + výsledky),
- **profil studenta** — `User.ai_tone` a `User.ai_expression_level`,
- **téma od studenta** — tah `next_question` s `focus` (lze vypnout).

```json
"settings": {
  "question_types": "mixed",     // "open" | "closed" | "mixed"
  "max_questions": null,          // limit na session; null = končí student
  "focus_allowed": true
}
```

Tahy: `{"kind": "option", "option_index": 1}` (closed) /
`{"kind": "answer", "text": "..."}` (open) — feedback přijde spolu s další
otázkou; `{"kind": "next_question", "focus": "GDPR"}` = přeskočit/zaměřit;
`{"kind": "finish"}` = konec. View: `practice_question` (otázka, typ,
možnosti, průběžné statistiky, `last_correct`/`last_feedback`).

Bez verdiktu — končí `completed`, `session.score` = procento správných.
Closed otázky vyhodnocuje kód (correct_index v `result`, možnosti se po
vygenerování míchají — LLM dává správnou možnost typicky první), open
otázky LLM. LLM klíče: `ai_practice_generator`, `ai_practice_evaluator`.

### `open_questions` — Otevřené otázky (s LLM evaluátorem)

Obdoba otevřených `PracticeQuestion` (otázka + vzorová odpověď + klíčová
slova) v nové architektuře. Student odpovídá volným textem po jedné otázce,
každou odpověď ohodnotí LLM (skóre 0-100 + feedback **bez prozrazení
odpovědi** — stejné pravidlo jako stávající `assessment_evaluator`, ale
se structured outputem místo parsování `SCORE:/FEEDBACK:` řádků).
Na konci průměr skóre proti prahu → `passed`/`failed`.

```json
"settings": {
  "questions": [
    {
      "question": "Vysvětli zásadu minimalizace dat.",
      "example_answer": "Vkládat jen údaje nezbytné pro daný účel...",
      "keywords": ["nezbytnost", "účel", "i u schválených nástrojů"]
    }
  ],
  "num_questions": null,
  "pass_threshold": 0.75,
  "evaluation_mode": "ai"
}
```

Tahy: `{"kind": "answer", "text": "odpověď studenta..."}`.
Views: `open_question` (otázka, pořadí, `last_score`, `last_feedback`)
→ `result`. LLM: `system_setting` klíč `open_questions_evaluator`.

**Režimy hodnocení (`evaluation_mode`):**

| režim | průběh | okamžitý feedback studentovi | verdikt |
|---|---|---|---|
| `ai` | LLM hodnotí každou odpověď hned | ano (skóre + feedback) | automaticky z průměru vs. práh |
| `human` | bez AI; po poslední odpovědi → `awaiting_review` | ne | lektor přes review endpoint |
| `ai_human` | LLM připraví **draft** (payload tahu, `ai_draft: true`) | ne | lektor přes review; draft vidí v podkladu |

Volba režimu je v settings záměrně — každý formát si sám určí (Pydantic
`Literal`), které režimy podporuje, a díky `settings_snapshot` změna režimu
nerozbije rozběhnuté session. Formát podporující lidské hodnocení přepíše
`handle_review()`; výchozí implementace v base hlásí nepodporu.

### `question_formulation` — Formulace otázek (s LLM)

Systém vylosuje jedno z garantových témat, student k němu formuluje N otázek,
AI dá slovní zpětnou vazbu ke každé (žádné skóre). Kola lze opakovat;
student končí sám tahem `finish` → `completed` (bez verdiktu).

```json
"settings": {
  "topics": ["Etika AI ve výuce", "Hodnocení s podporou AI"],
  "questions_per_round": 3
}
```

Tahy: `{"kind": "questions", "questions": ["...", "...", "..."]}` (přesně
`questions_per_round` položek), pak `{"kind": "finish"}`.
LLM: `system_setting` klíč `question_formulation_feedback`.

## Návod: jak přidat nový formát

Checklist na příkladu formátu `socratic_dialog`:

**1. Katalog** — `backend/api/seed.py`, přidat do `ASSESSMENT_TYPES`:

```python
{
    "code": "socratic_dialog",
    "name": "Sokratický dialog",
    "description": "...",
    "allowed_contexts": ["practice", "assessment", "course_final"],
    "default_settings": {"topics": [], "min_turns": 2, "max_turns": 6},
},
```

Do existující DB doplnit řádek ručně (seed plní jen prázdnou tabulku).

**2. View a turn input** — `agents/assessments/schemas.py`:

```python
class MessageTurnInput(BaseModel):
    kind: Literal["message"] = "message"
    text: str = Field(..., min_length=1)

class SocraticDialogView(BaseModel):
    kind: Literal["socratic_dialog"] = "socratic_dialog"
    messages: list[ChatMessage]
    turns_remaining: int
```

...a přidat oba do unions `TurnInput` a `AssessmentView`. Toto je jediné
sdílené místo, kterého se nový formát dotkne.

**3. Balíček formátu** — `agents/assessments/socratic_dialog/`:

```
__init__.py     # from ...service import SocraticDialogService  (kvůli @register)
settings.py     # SocraticSettings(BaseModel), extra="forbid"
service.py      # @register class SocraticDialogService(BaseAssessmentService)
```

Konverzační formát rekonstruuje historii z tahů:

```python
async def handle_turn(self, turn):
    history = [t for t in self.session.turns if t.role in (student, assistant)]
    # → sestavit LangGraph state / messages, ainvoke, uložit nové tahy
```

**4. Registrace** — `agents/assessments/__init__.py`:

```python
from agents.assessments import socratic_dialog  # noqa: F401
```

**5. Pokud formát používá LLM** — přidat prompt do `SYSTEM_SETTINGS`
v `seed.py` + `DEFAULT_MODEL`/`DEFAULT_PROMPT` fallback v service.

**6. Frontend** — `npm run generate:openapi`, přidat komponentu do mapy
`view.kind → komponenta` a settings formulář lektora.

**7. Ověření bez DB** — service jde smoke-testovat s fake db
(objekt s `add()`) a ORM `AssessmentSession` vytvořenou v paměti;
u LLM formátů zamockovat `_generate_*` metodu.

Co **není** potřeba: nový endpoint, změna controllerů, nová tabulka, migrace.

## Frontend integrace

- Klient se generuje ze Swaggeru: `npm run generate:openapi`
  (typescript-fetch). Unions se propíšou jako typované `oneOf`.
- Jedna generická stránka pro průběh: podle `view.kind` vybere komponentu
  z mapy. `ResultView` je společný pro všechny formáty.
- Obnova stavu: při vstupu na stránku zavolat
  `GET /course-assessments/{id}/sessions/current`; 404 → nabídnout start.
- Start je idempotentní — dvojklik nevytvoří druhou session.
- Lektorův formulář settings: pole podle formátu, předvyplnit
  `default_settings` z katalogu; chyby validace chodí jako 422 s popisem.

## Časté chyby a záludnosti

| symptom | příčina / řešení |
|---|---|
| `union_tag_invalid ... expected_tags: 'questions', 'finish', 'option'` | do `/turns` posíláte `view.kind` místo turn kind — viz [Dva různé kind](#dva-různé-kind--nezaměňovat) |
| 422 `topics: List should have at least 1 item` / `questions: ...` | `settings: null` vzalo default z katalogu, který je schválně prázdný — vyplňte obsah |
| 422 `Extra inputs are not permitted` | překlep v názvu pole settings (`extra="forbid"` je záměr) |
| FK violation `...assessment_type_code...` | formát není v katalogu dané DB — seed doplňuje jen prázdnou tabulku, vložte řádek ručně |
| 409 „Session není rozběhnutá" | tah do ukončené session; založte novou přes POST sessions |
| 400 „Očekává se přesně N otázek" | počet položek v `questions` nesedí na `questions_per_round` ze snapshotu |
| změna settings „se neprojevila" studentovi | záměr — rozběhnuté session jedou ze `settings_snapshot`; projeví se u nových sessions |
| service „neukládá" změny v `result` | in-place mutace JSONB — používejte `update_result()` |
| formát je v katalogu, ale start vrací 500 | service není zaregistrovaná — chybí import v `agents/assessments/__init__.py` |
| 409 „Session nečeká na hodnocení" | review na session, která není `awaiting_review` (už ohodnocená, nebo režim `ai`) |
| 400 „Formát ... nepodporuje hodnocení člověkem" | formát nepřepisuje `handle_review()` / režim je `ai` |
