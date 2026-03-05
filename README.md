# Praktik-AI

Platforma pro systematický rozvoj AI kompetencí akademických pracovníků pedagogických fakult. Systém umožňuje tvorbu, správu a absolvování kurzů s podporou AI agentů pro generování obsahu a mentoring studentů.

---

## High-Level Design

```text
┌─────────────────────────────────────────────────────────────────────┐
│                            UŽIVATEL                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (Next.js 15)                          │
│                                                                     │
│   /courses        /modules        /admin        /profil             │
│   /courses/:id    /activities     /admin/*       /about             │
└───────┬───────────────────────────────┬─────────────────────────────┘
        │ REST (axios)                  │ OpenID Connect
        ▼                              ▼
┌───────────────────┐        ┌─────────────────────┐
│   BACKEND API     │        │   KEYCLOAK 26.4      │
│   (FastAPI)       │◄───────│   Identity Provider  │
│   :8000           │  JWT   │   :8080              │
│                   │        └─────────────────────-┘
│  ┌─────────────┐  │
│  │   Routers   │  │
│  │  /auth      │  │
│  │  /courses   │  │
│  │  /modules   │  │
│  │  /activities│  │
│  │  /categories│  │
│  │  /agents    │  │
│  └──────┬──────┘  │
│         │         │
│  ┌──────▼──────┐  │        ┌─────────────────────┐
│  │  AI Agents  │  │        │   POSTGRESQL + pgvector│
│  │  (LangGraph)│  │◄──────►│   :5432              │
│  │             │  │        │                     │
│  │ • Generator │  │        │  courses, modules,  │
│  │ • Embedding │  │        │  activities, vectors│
│  │ • Mentor    │  │        └─────────────────────┘
│  └──────┬──────┘  │
└─────────┼─────────┘
          │ API calls
          ▼
┌─────────────────────┐
│   OPENAI API        │
│   GPT-4o-mini       │
└─────────────────────┘
```

---

## Učební model — průchod kurzem

```text
                        KURZ
┌───────────────────────────────────────────────────────┐
│                                                       │
│   Modul 1          Modul 2          Modul N           │
│  ┌────────┐        ┌────────┐       ┌────────┐        │
│  │ Learn  │        │ Learn  │       │ Learn  │        │
│  │   ↓   │ ──►    │   ↓   │ ──►   │   ↓   │        │
│  │Practice│ unlock │Practice│ unlock│Practice│        │
│  │   ↓   │        │   ↓   │       │   ↓   │        │
│  │Assess. │        │Assess. │       │Assess. │        │
│  └────────┘        └────────┘       └────────┘        │
│    PASS ✓            PASS ✓           PASS ✓          │
│                                         = HOTOVO      │
└───────────────────────────────────────────────────────┘
```

Každý modul je samostatná uzavřená jednotka. Přechod do dalšího modulu je podmíněn úspěšným dokončením **Assessment** fáze aktuálního modulu.

---

## AI Agenti (LangGraph)

### 1. Generátor kurzů

Generuje strukturu kurzu ze zdrojových materiálů (markdown, dokumenty).

```text
load_data_db → load_data → summarize_content → plan_content → save_to_db
```

### 2. Generátor embeddingů

Vytváří vektorové reprezentace LearnBlocků a ukládá je do pgvector pro sémantické vyhledávání.

### 3. Mentor agent (RAG)

Konverzační asistent pro studenty. Vyhledává relevantní obsah z kurzu pomocí sémantického vyhledávání a generuje odpovědi.

```text
load_learn_block_data → rerank → generate_answer
```

---

## Autorizace — role (RBAC)

| Role         | Oprávnění                              |
|--------------|----------------------------------------|
| `superadmin` | Vše včetně správy systému              |
| `admin`      | Správa kurzů, uživatelů, kategorií     |
| `user`       | Procházení a absolvování kurzů         |

Hierarchie: `superadmin > admin > user`

---

## Struktura projektu

```text
├── backend/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/          # Autentizace
│   │   │   ├── courses/       # Správa kurzů
│   │   │   ├── modules/       # Moduly kurzů
│   │   │   ├── activities/    # LearnBlocky, otázky, odpovědi
│   │   │   ├── categories/    # Kategorie kurzů
│   │   │   └── agents/        # AI agent endpointy
│   │   ├── main.py            # FastAPI aplikace
│   │   ├── models.py          # SQLAlchemy modely
│   │   ├── dependencies.py    # Auth dependency injection
│   │   └── config.py          # Konfigurace (Keycloak, PostgreSQL)
│   └── agents/
│       ├── course_generator/  # LangGraph agent — generátor kurzů
│       ├── embedding_generator/ # Agent pro vektorové embeddingy
│       ├── mentor/            # Mentor chatbot agent
│       └── base/              # Sdílené komponenty (loadery)
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js stránky (App Router)
│   │   ├── components/        # React komponenty
│   │   ├── api/               # Generovaný TypeScript klient (OpenAPI)
│   │   └── hooks/             # React hooks
│   └── package.json
├── infra/docker/              # Dockerfiles
├── compose.yml                # Docker Compose
└── Makefile                   # Dev příkazy
```

---

## Technologie

| Vrstva      | Technologie                                      |
|-------------|--------------------------------------------------|
| Frontend    | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend     | FastAPI, SQLAlchemy 2, Python 3.13, uv           |
| AI          | LangGraph, LangChain, OpenAI GPT-4o-mini         |
| Databáze    | PostgreSQL 18 + pgvector                         |
| Auth        | Keycloak 26.4 (OpenID Connect / OAuth2)          |
| Úložiště    | SeaweedFS (master + volume + filer)              |
| Kontejnery  | Docker, Docker Compose                           |

---

## SeaweedFS – souborové úložiště

SeaweedFS nahrazuje ukládání souborů na lokální disk. Používá se pro nahrávání studijních materiálů ke kurzům.

### Architektura

| Komponenta       | Port | Popis                                         |
|------------------|------|-----------------------------------------------|
| seaweedfs-master | 9333 | Koordinátor – správa metadat a volume serverů |
| seaweedfs-volume | 8081 | Datové úložiště – ukládá samotné soubory      |
| seaweedfs-filer  | 8888 | REST API pro práci se soubory                 |

### Spuštění

SeaweedFS se spouští automaticky s ostatními službami:

```bash
docker compose up -d
```

Nebo samostatně:

```bash
docker compose up -d seaweedfs-master seaweedfs-volume seaweedfs-filer
```

### Použití v backendu

Helper `backend/api/storage/seaweedfs.py` poskytuje tři funkce:

```python
from api.storage.seaweedfs import upload_file, download_file, delete_file

# Nahrání souboru
url = upload_file("courses/42/dokument.pdf", content, "dokument.pdf", "application/pdf")

# Stažení souboru
data: bytes = download_file("courses/42/dokument.pdf")

# Smazání souboru
delete_file("courses/42/dokument.pdf")
```

Konfigurace přes env proměnné (viz `.env_example`):

```env
SEAWEEDFS__MASTER_URL=http://seaweedfs-master:9333
SEAWEEDFS__FILER_URL=http://seaweedfs-filer:8888
```

---

## Rychlý start

### 1. Konfigurace prostředí

```bash
cp env_example .env
```

Upravte `.env` — minimálně:

```env
# OpenAI (pro AI agenty)
OPENAI_API_KEY=sk-...

# PostgreSQL
POSTGRES__HOST=db
POSTGRES__PORT=5432
POSTGRES__USER=...
POSTGRES__PASSWORD=...
POSTGRES__DB=...

# Keycloak
KEYCLOAK__SERVER_URL=http://keycloak:8080/
KEYCLOAK__REALM_NAME=...
KEYCLOAK__CLIENT_ID=...
KEYCLOAK__CLIENT_SECRET=...
KEYCLOAK__ADMIN_USERNAME=...
KEYCLOAK__ADMIN_PASSWORD=...

# Keycloak bootstrap
KC_BOOTSTRAP_ADMIN_USERNAME=...
KC_BOOTSTRAP_ADMIN_PASSWORD=...
```

### 2. Spuštění

```bash
make dev        # API + PostgreSQL (hot reload)
make db         # pouze databáze
```

| Služba           | URL                          |
|------------------|------------------------------|
| API              | <http://localhost:8000>      |
| API docs         | <http://localhost:8000/docs> |
| Frontend         | <http://localhost:3000>      |
| Keycloak         | <http://localhost:8080>      |
| SeaweedFS Master | <http://localhost:9333>      |
| SeaweedFS Filer  | <http://localhost:8888>      |

### 3. Generování TypeScript klienta

```bash
cd frontend
npm run generate:openapi
```

---

## API Endpoints

| Prefix        | Endpointy                                              |
|---------------|--------------------------------------------------------|
| `/auth`       | `POST /token`, `GET /me`, `GET /roles`                 |
| `/courses`    | CRUD kurzů, upload souborů, správa odkazů, stavů       |
| `/modules`    | CRUD modulů v rámci kurzu                              |
| `/activities` | LearnBlocky, PracticeQuestions, odpovědi, klíčová slova|
| `/categories` | CRUD kategorií                                         |
| `/agents`     | `POST /generate-course`, `/generate-course-embeddings`, `/learn-blocks-chat` |

Všechny endpointy jsou pod prefixem `/api/v1/`.
