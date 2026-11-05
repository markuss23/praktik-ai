# Praktik-AI

Platforma pro rozvoj AI kompetencí akademických pracovníků pedagogických fakult. Lektoři v ní s pomocí AI tvoří kurzy, studenti je procházejí s AI mentorem a AI je i hodnotí.

**Stack:** Next.js 15 · FastAPI · PostgreSQL 18 + pgvector · LangGraph · Keycloak · SeaweedFS · Docker Compose

## Obsah

- [Rychlý start](#rychlý-start)
- [Konfigurace](#konfigurace)
- [Vývoj](#vývoj)
- [Architektura](#architektura)
- [Učební model a testy](#učební-model-a-testy)
  - [Typy testů](#typy-testů)
- [AI agenti](#ai-agenti)
- [Role](#role)
- [Struktura projektu](#struktura-projektu)
- [Další dokumentace](#další-dokumentace)
- [Přispívání](#přispívání)
- [Licence](#licence)

---

## Rychlý start

**Potřebuješ:** Docker s Compose v2 a API klíč k Anthropic nebo OpenAI.

```bash
git clone https://github.com/markuss23/praktik-ai.git
cd praktik-ai
cp .env_example .env     # vyplň hodnoty, viz Konfigurace
docker compose up -d --build
```

Při prvním startu API samo vytvoří tabulky (`init_db`) a naplní číselníky a systémová nastavení (`seed_db`). Keycloak importuje dev realm z `infra/keycloak/praktikai-dev-realm.json`.

| Služba | URL |
| --- | --- |
| Frontend | <http://localhost:3000> |
| API + Swagger UI | <http://localhost:8000> (endpointy pod `/api/v1`) |
| Health check | <http://localhost:8000/health> |
| Keycloak admin | <http://localhost:8080> |
| SeaweedFS filer | <http://localhost:8888> |
| PostgreSQL | `localhost:5433` |

Funguje to, když `/health` vrátí `{"message": "ok"}` a na frontendu se dá přihlásit.

---

## Konfigurace

Všechno jde přes kořenový `.env`. Šablona je v [`.env_example`](.env_example). Vnořená nastavení backendu oddělují dvě podtržítka (`POSTGRES__HOST` → `settings.postgres.host`).

| Proměnná | Povinná | Popis |
| --- | --- | --- |
| `POSTGRES__HOST`, `__PORT`, `__USER`, `__PASSWORD`, `__DB` | ano | Připojení k DB. V Dockeru `db` / `5432`, z hostu `localhost` / `5433` |
| `KEYCLOAK__SERVER_URL`, `__REALM_NAME`, `__CLIENT_ID`, `__CLIENT_SECRET` | ano | Ověřování JWT na backendu |
| `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD` | ano | Admin účet Keycloaku |
| `ANTHROPIC_API_KEY` | ano* | Výchozí modely jsou Claude. V `.env_example` zatím chybí, je potřeba ho doplnit |
| `OPENAI_API_KEY` | ano* | Pro modely `gpt-*` a embeddingy |
| `NEXT_PUBLIC_KEYCLOAK_URL`, `_REALM`, `_CLIENT_ID`, `NEXT_API_URL` | ano | Frontend. Vkládají se při buildu image |
| `SEAWEEDFS__MASTER_URL`, `__FILER_URL` | ne | Úložiště souborů. Výchozí hodnoty odpovídají Compose |
| `WIKI__REPO_URL`, `__LOCAL_PATH`, `__SYNC_INTERVAL_HOURS` | ne | Synchronizace GitHub wiki pro AI mentora |
| `AI_DAILY_TOKEN_LIMIT` | ne | Denní limit AI tokenů pro roli `user`. `0` = bez limitu, spotřeba se jen zaznamenává. Po překročení vrací API 429 |
| `LOG_LEVEL` | ne | Úroveň logování, výchozí `INFO` |

\* Nastav aspoň ten klíč, jehož modely používáš. Model se vybírá podle prefixu (`claude-*` nebo `gpt-*`), viz [`agents/base/llm.py`](backend/agents/base/llm.py).

Prompty a modely jednotlivých agentů jsou v DB tabulce `system_setting`. Superadmin je mění v administraci, výchozí hodnoty jsou v [`backend/api/seed.py`](backend/api/seed.py).

---

## Vývoj

### Backend bez frontendu

```bash
make backend-dev      # api + db + keycloak + seaweedfs, se sestavením image
make db               # jen databáze
```

Složka `backend/` je do kontejneru připojená jako volume.

### Frontend lokálně

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
npm run generate:openapi    # TS klient do src/api, potřebuje běžící API
```

Klient v `frontend/src/api/` je generovaný. Needituj ho ručně, po každé změně API ho vygeneruj znovu.

### Migrace DB

Nové tabulky vytváří `init_db` sám. Změny existujících tabulek a převody dat dělají SQL skripty v [`migrations/`](migrations/). Spouští se ručně a popořadě. Každý skript má v hlavičce popis a přesný příkaz:

```bash
docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' \
  < migrations/0026_legacy_practice_and_task_to_assessments.sql
```

### Aktualizace promptů ze seed.py

```bash
make update-settings                       # všechny klíče
make update-settings KEYS=course_planner   # jen vybrané
```

### Testy a lint

```bash
cd backend
uv sync
uv run pytest tests        # rychlé testy, bez DB a bez API klíčů
uv run ruff check .        # stejný lint jako v CI
```

Testy proti skutečné DB a se skutečným LLM popisuje [backend/tests/README.md](backend/tests/README.md).

### CI

| Workflow | Kdy běží | Co dělá |
| --- | --- | --- |
| `check_backend_lint.yml` | push do `dev` | `ruff` nad `backend/` |
| `check_frotend_audit.yml` | push do `dev`, PR do `dev`/`main` | `npm audit` frontendu |
| `refresh-course-manual.yml` | ručně (workflow_dispatch) | Obnoví screenshoty manuálu a otevře PR do `dev` |

---

## Architektura

```text
                 Uživatel
                    │ HTTPS
                    ▼
        ┌───────────────────────┐   OIDC   ┌──────────────────┐
        │ Frontend (Next.js 15) │─────────►│ Keycloak 26.4    │
        │ :3000                 │          │ :8080            │
        └───────────┬───────────┘          └────────┬─────────┘
                    │ REST /api/v1                  │ JWT
                    ▼                               │
        ┌───────────────────────┐◄──────────────────┘
        │ Backend (FastAPI)     │
        │ :8000                 │──────────► SeaweedFS (soubory, obrázky)
        │  routery, assessments │
        │  AuditLog, AI usage   │
        └─────┬───────────┬─────┘
              │           │
              ▼           ▼
   ┌──────────────┐  ┌──────────────────────┐     ┌────────────────────┐
   │ PostgreSQL 18│◄─│ AI agenti (LangGraph)│────►│ Anthropic / OpenAI │
   │ + pgvector   │  │ backend/agents/      │     └────────────────────┘
   │ :5433        │  └──────────────────────┘
   └──────────────┘
```

- **Frontend** volá API přes klienta generovaného z OpenAPI. Přihlášení řeší Keycloak.
- **Backend** ověřuje JWT z Keycloaku a role synchronizuje do DB při přihlášení. Každou změnu dat zapisuje do `audit_log`. Spotřebu tokenů zapisuje do `ai_usage`.
- **AI agenti** jsou grafy v LangGraph. Volají se z backendu, vektory ukládají do pgvectoru.

---

## Učební model a testy

Kurz se skládá z modulů. Modul obsahuje studijní obsah (LearnBlocky s AI mentorem) a testy. Testy řídí assessment systém v [`backend/api/src/assessments/`](backend/api/src/assessments/).

```text
Modul 1:  pretest → practice → assessment ┐
Modul 2:  pretest → practice → assessment ├──► course_final ──► kurz hotový
Modul N:  pretest → practice → assessment ┘
```

| Kontext | K čemu slouží | Odemyká se po |
| --- | --- | --- |
| `pretest` | Vstupní ověření znalostí modulu | hned |
| `practice` | Procvičování | splnění pretestu |
| `assessment` | Závěrečný test modulu | splnění practice |
| `course_final` | Závěr celého kurzu | splnění assessmentů všech modulů |

Postup hlídá gate. Počítají se jen povinné konfigurace (`is_required`). Když student krok přeskočí, API vrátí 403.

### Typy testů

Lektor ke každému kontextu přiřadí jeden nebo víc typů:

| Formát | Popis |
| --- | --- |
| [`pretest`](backend/api/src/assessments/pretest/README.md) | Uzavřené otázky + otevřená otázka na začátku modulu |
| [`closed_questions`](backend/api/src/assessments/closed_questions/README.md) | Uzavřené otázky od lektora |
| [`closed_questions_ai`](backend/api/src/assessments/closed_questions_ai/README.md) | Uzavřené otázky generuje AI |
| [`open_question_ai`](backend/api/src/assessments/open_question_ai/README.md) | Otevřená otázka, hodnotí ji AI |
| [`socratic_dialog_ai`](backend/api/src/assessments/socratic_dialog_ai/README.md) | Sokratovský dialog s AI, skóre podle ELO |

**Nový formát:** založ složku se stejným rozhraním jako [`closed_questions/__init__.py`](backend/api/src/assessments/closed_questions/__init__.py) a přidej řádek do `FORMATS` v [`assessments/utils.py`](backend/api/src/assessments/utils.py).

---

## AI agenti

Agenti jsou v [`backend/agents/`](backend/agents/).

| Agent | Co dělá |
| --- | --- |
| `course_generator` | Ze zdrojových materiálů udělá souhrn, plán kurzu a moduly zařazené do číselníků |
| `embedding_generator` | Vytváří vektory LearnBlocků do pgvectoru |
| `mentor` | RAG chatbot nad obsahem modulu nebo celého kurzu |
| `wiki` | Synchronizuje GitHub wiki a odpovídá z ní (plánovač běží v `lifespan`) |
| `image_generator` | Generuje obrázky ke kurzům a modulům |
| `assessment_generator`, `assessment_evaluator` | Zadání a hodnocení závěrečného úkolu |
| `practice_question_generator`, `practice_answer_evaluator` | Procvičovací otázky a hodnocení odpovědí |
| `base/` | Sdílené části: výběr LLM, loadery, vector store |

Formáty s AI (`*_ai`) mají vlastní agenty ve své složce v `assessments/`.

---

## Role

Role se spravují v Keycloaku jako realm roles. Do DB se synchronizují při přihlášení.

| Role | Co smí |
| --- | --- |
| `user` | Procházet katalog, zapsat se do kurzu, absolvovat ho |
| `lector` | Navíc tvořit a spravovat vlastní kurzy |
| `guarantor` | Navíc kontrolovat a schvalovat kurzy, psát k nim feedback |
| `superadmin` | Navíc spravovat systémová nastavení, uživatele a číselníky |

Kontroly vlastnictví jsou v [`backend/api/authorization.py`](backend/api/authorization.py).

---

## Struktura projektu

```text
├── backend/
│   ├── api/
│   │   ├── main.py            # FastAPI app, middleware, lifespan
│   │   ├── models.py          # SQLAlchemy modely
│   │   ├── seed.py            # číselníky, prompty a modely agentů
│   │   ├── config.py          # nastavení z .env
│   │   ├── dependencies.py    # CurrentUser, Keycloak, AI limit
│   │   ├── authorization.py   # kontroly vlastníka a rolí
│   │   ├── audit.py           # AuditLog listener
│   │   └── src/               # jedna složka = jeden router
│   │       ├── assessments/   # testy: formáty, gate, sessions
│   │       ├── courses/  modules/  activities/  enrollments/
│   │       ├── feedbacks/  module_tickets/  users/  superadmin/
│   │       ├── catalogs/  editor_images/  publicDB/  agents/  auth/
│   │       └── common/        # sdílené utility
│   ├── agents/                # LangGraph agenti
│   ├── scripts/               # update_system_settings
│   └── tests/
├── frontend/src/
│   ├── app/(main)/            # veřejná část a studium
│   ├── app/admin/             # administrace
│   ├── api/                   # generovaný OpenAPI klient
│   └── components/
├── migrations/                # ruční SQL migrace, číslované
├── infra/
│   ├── docker/                # Dockerfily, init-db.sql
│   └── keycloak/              # dev realm a téma
├── docs/manuals/              # uživatelské manuály
├── compose.yml
└── Makefile
```

---

## Další dokumentace

- [backend/tests/README.md](backend/tests/README.md): jak spouštět testy
- [Typy testů](#typy-testů): README každého typu
- [docs/manuals/jak-vytvorit-kurz](docs/manuals/jak-vytvorit-kurz/README.md): manuál pro lektory
- [GitHub wiki](https://github.com/markuss23/praktik-ai/wiki)

---

## Přispívání

1. Větev založ z `dev`. Do `main` jde jen přes PR.
2. Před pushem pusť `uv run ruff check .` a `uv run pytest tests`.
3. Když měníš schéma existující tabulky, přidej další číslovaný skript do `migrations/`.
4. Když měníš API, vygeneruj znovu frontendového klienta.

---

## Licence

[MIT](LICENSE)
