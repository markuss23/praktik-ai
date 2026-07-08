# Praktik-AI

Platforma pro systematický rozvoj AI kompetencí akademických pracovníků pedagogických fakult. Umožňuje tvorbu, správu a absolvování kurzů s podporou AI agentů pro generování obsahu, evaluaci a mentoring.

---

## High-Level Design

```text
┌──────────────────────────────────────────────────────────────────────┐
│                             UŽIVATEL                                 │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (Next.js 15)                        │
│                                                                      │
│  /courses   /courses/:slug   /modules/:slug   /moje-kurzy   /tutor   │
│  /profil    /odmeny          /admin/*                                │
└──────────────┬───────────────────────────────┬───────────────────────┘
               │ REST / JSON                   │ OpenID Connect
               ▼                               ▼
┌──────────────────────────┐       ┌───────────────────────┐
│     BACKEND API          │       │   KEYCLOAK 26.4        │
│     (FastAPI :8000)      │◄──────│   Identity Provider    │
│                          │  JWT  │   :8080                │
│  /auth                   │       └───────────────────────┘
│  /courses  /modules      │
│  /activities             │
│  /enrollments            │
│  /feedbacks              │
│  /module-tickets         │
│  /users   /superadmin    │
│  /catalogs               │
│  /agents ─────────────────────────────────────────────┐
│                          │                            │
│  SQLAlchemy ORM          │                            │
│  + AuditLog listener     │                            │
└──────────┬───────────────┘                            │
           │                                            │
           ▼                                            ▼
┌──────────────────────┐              ┌─────────────────────────────┐
│  POSTGRESQL 18       │              │   AI AGENTI  (LangGraph)    │
│  + pgvector          │◄────────────►│                             │
│  :5432               │              │  • course_generator         │
│                      │              │  • embedding_generator      │
│  courses, modules,   │              │  • assessment_generator     │
│  activities, users,  │              │  • assessment_evaluator     │
│  enrollments,        │              │  • practice_q_generator     │
│  audit_log, vectors  │              │  • practice_a_evaluator     │
└──────────────────────┘              │  • mentor  (RAG)            │
                                      └──────────────┬──────────────┘
┌──────────────────────┐                             │ API calls
│  SEAWEEDFS           │                             ▼
│  master  :9333       │              ┌─────────────────────────────┐
│  volume  :8081       │              │   ANTHROPIC / OPENAI API    │
│  filer   :8888       │              │   Claude / GPT-4o           │
└──────────────────────┘              └─────────────────────────────┘
```

---

## Učební model — průchod kurzem

```text
                             KURZ
┌─────────────────────────────────────────────────────────┐
│                                                         │
│    Modul 1           Modul 2  . . .     Modul N         │
│  ┌──────────┐      ┌──────────┐       ┌──────────┐      │
│  │ Learn    │      │ Learn    │       │ Learn    │      │
│  │ (obsah)  │      │ (obsah)  │       │ (obsah)  │      │
│  │    ↓     │ ──►  │    ↓     │ ──►   │    ↓     │      │
│  │ Practice │unlock│ Practice │unlock │ Practice │      │
│  │ (cvičení)│      │ (cvičení)│       │ (cvičení)│      │
│  │    ↓     │      │    ↓     │       │    ↓     │      │
│  │ Assess.  │      │ Assess.  │       │ Assess.  │      │
│  │ (AI test)│      │ (AI test)│       │ (AI test)│      │
│  └──────────┘      └──────────┘       └──────────┘      │
│      PASS ✓            PASS ✓             PASS ✓        │
│                                               = HOTOVO  │
└─────────────────────────────────────────────────────────┘
```

Každý modul je samostatná uzavřená jednotka:

| Fáze | Popis |
| --- | --- |
| **Learn** | Studijní obsah (LearnBlock) s AI mentorem |
| **Practice** | Procvičovací otázky (closed/open), personalizované AI otázky |
| **Assessment** | AI-generovaný úkol, evaluace AI agentem, max. N pokusů |

---

## AI Agenti

| Agent | Funkce | Pipeline |
| --- | --- | --- |
| `course_generator` | Generuje strukturu kurzu ze zdrojových materiálů | `load_data → summarize → plan → save_to_db` |
| `embedding_generator` | Vytváří vektory LearnBlocků pro sémantické vyhledávání | `load → embed → upsert pgvector` |
| `assessment_generator` | Generuje zadání závěrečného úkolu modulu | `load_context → generate_task` |
| `assessment_evaluator` | Vyhodnocuje odpověď studenta na assessment | `load_task → evaluate → score` |
| `practice_q_generator` | Generuje personalizované procvičovací otázky | `load_context → generate_question` |
| `practice_a_evaluator` | Vyhodnocuje odpověď na open otázku | `load_question → evaluate` |
| `mentor` | RAG chatbot pro dotazy k obsahu LearnBlocku | `load_learn_block → rerank → generate_answer` |

---

## Autorizace — role (RBAC)

| Role | Oprávnění |
| --- | --- |
| `user` | Procházení katalogu, zápis do kurzu, absolvování |
| `lector` | + Tvorba a správa vlastních kurzů |
| `guarantor` | + Review kurzů, schvalování, feedback |
| `superadmin` | + Správa systémových nastavení, uživatelů, číselníků |

Role jsou spravovány v Keycloaku (realm roles), do DB se synchronizují při přihlášení.

---

## Struktura projektu

```text
├── backend/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/             # /auth — přihlášení, token, sync uživatele
│   │   │   ├── courses/          # /courses — CRUD kurzů, soubory, odkazy, stavy
│   │   │   ├── modules/          # /modules — CRUD modulů, progress, assessment
│   │   │   ├── activities/       # /activities — LearnBlocky, otázky, klíčová slova
│   │   │   ├── enrollments/      # /enrollments — zápis do kurzu
│   │   │   ├── feedbacks/        # /feedbacks — komentáře garanta ke kurzu
│   │   │   ├── module_tickets/   # /module-tickets — reklamace AI hodnocení
│   │   │   ├── users/            # /users — profil, AI nastavení
│   │   │   ├── superadmin/       # /superadmin — systémová nastavení, číselníky
│   │   │   ├── catalogs/         # /catalogs — bloky, cíle, obory
│   │   │   ├── agents/           # /agents — volání AI agentů
│   │   │   └── common/           # sdílené utility (get_or_404, ...)
│   │   ├── main.py               # FastAPI app, middleware, lifespan
│   │   ├── models.py             # SQLAlchemy ORM modely
│   │   ├── audit.py              # AuditLog listener (before_flush)
│   │   ├── authorization.py      # owner / role checks
│   │   ├── dependencies.py       # CurrentUser, Keycloak auth
│   │   ├── database.py           # SessionLocal, init_db
│   │   ├── enums.py              # StrEnum hodnoty
│   │   └── config.py             # Pydantic settings
│   └── agents/
│       ├── course_generator/
│       ├── embedding_generator/
│       ├── assessment_generator/
│       ├── assessment_evaluator/
│       ├── practice_question_generator/
│       ├── practice_answer_evaluator/
│       ├── mentor/
│       ├── base/                 # sdílené loadery, vector store
│       └── vector_store.py
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (main)/           # veřejné stránky (layout s navbar)
│       │   │   ├── courses/      # katalog kurzů
│       │   │   ├── modules/      # detail modulu (learn, practice, assess)
│       │   │   ├── moje-kurzy/   # moje zapsané kurzy
│       │   │   ├── tutor/        # AI tutor
│       │   │   ├── profil/
│       │   │   └── odmeny/
│       │   ├── admin/            # správa (lector/guarantor/superadmin)
│       │   │   ├── categories/
│       │   │   ├── review/       # schvalování kurzů
│       │   │   ├── stats/
│       │   │   └── ai-mentor/
│       │   └── auth/             # OAuth callback
│       ├── components/
│       ├── api/                  # generovaný OpenAPI klient
│       └── hooks/
├── infra/
│   ├── docker/                   # Dockerfile pro jednotlivé služby
│   └── scripts/
├── compose.yml
└── Makefile
```

---

## Technologie

| Vrstva | Technologie |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy 2, Python 3.13, uv |
| AI | LangGraph, LangChain, Anthropic / OpenAI |
| Databáze | PostgreSQL 18 + pgvector |
| Auth | Keycloak 26.4 (OpenID Connect / OAuth 2.0) |
| Úložiště | SeaweedFS (master + volume + filer) |
| Kontejnery | Docker, Docker Compose |

---

## Rychlý start

### 1. Konfigurace prostředí

```bash
cp env_example .env
```

Minimálně vyplnit v `.env`:

```env
OPENAI_API_KEY=sk-...

POSTGRES__HOST=db
POSTGRES__PORT=5432
POSTGRES__USER=...
POSTGRES__PASSWORD=...
POSTGRES__DB=...

KEYCLOAK__SERVER_URL=http://keycloak:8080/
KEYCLOAK__REALM_NAME=...
KEYCLOAK__CLIENT_ID=...
KEYCLOAK__CLIENT_SECRET=...

KC_BOOTSTRAP_ADMIN_USERNAME=...
KC_BOOTSTRAP_ADMIN_PASSWORD=...

SEAWEEDFS__MASTER_URL=http://seaweedfs-master:9333
SEAWEEDFS__FILER_URL=http://seaweedfs-filer:8888
```

### 2. Spuštění

```bash
docker compose up -d
```

| Služba | URL |
| --- | --- |
| API | <http://localhost:8000> |
| API docs (Swagger) | <http://localhost:8000/docs> |
| Frontend | <http://localhost:3000> |
| Keycloak | <http://localhost:8080> |
| SeaweedFS Filer | <http://localhost:8888> |

### 3. Generování TypeScript klienta

```bash
cd frontend
npm run generate:openapi
```
