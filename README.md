# praktik-ai

Projekt cílí na systematickou transformaci přípravy učitelů pro digitální éru prostřednictvím rozvoje AI kompetencí akademických pracovníků pedagogických fakult. Hlavním cílem je vytvořit a pilotně ověřit komplexní systém zahrnující certifikovanou metodiku rozvoje AI.

## Struktura projektu

```
├── backend/           # FastAPI backend + LangGraph agenti
│   ├── api/           # REST API (FastAPI)
│   └── agents/        # AI agenti pro generování kurzů
├── frontend/          # Next.js frontend
├── infra/docker/      # Dockerfiles
├── authentik/         # Authentik konfigurace
└── compose.yml        # Docker Compose
```

## Rychlý start

### 1. Konfigurace prostředí

Vytvořte soubor `.env` v kořenovém adresáři projektu:

```bash
cp env_example .env
```

Pro použití AI agentů přidejte do `.env`:

```env
OPENAI_API_KEY=your-openai-api-key
```

### 2. Spuštění

```bash
make dev
```

Tím se spustí:

- **PostgreSQL** databáze s pgvector na portu `5432`
- **API** server na portu `8000`

### Další příkazy

```bash
make db      # Spustí pouze databázi
```

## API Endpoints

- `GET /courses` - Seznam kurzů
- `POST /courses` - Vytvoření kurzu
- `POST /courses/{id}/generate` - Generování kurzu pomocí AI

## AI Agent - Generátor kurzů

Workflow pro generování kurzů ze zdrojových materiálů:

```md
load_data_db → load_data → summarize_content → plan_content → save_to_db
```

### Modely kurzu

| Pole | Popis |
|------|-------|
| `is_generated` | Kurz byl vygenerován ze zdrojů |
| `is_approved` | Kurz byl schválen |
| `is_published` | Kurz je publikován |
| `summary` | Sumarizovaný text ze zdrojů |

## Technologie

- **Backend**: FastAPI, SQLAlchemy, LangGraph, LangChain
- **Frontend**: Next.js, TypeScript
- **Databáze**: PostgreSQL + pgvector
- **AI**: OpenAI GPT-4o-mini
- **Auth**: Authentik

## High-Level Overview
Uživatel prochází kurzem sekvenčním způsobem. Kurz se skládá z $N$ modulů. Aby uživatel kurz úspěšně dokončil, musí splnit všechny moduly v předepsaném pořadí.Každý modul funguje jako samostatná, uzavřená jednotka (Black Box), která uvnitř obsahuje cyklus Learn – Practice – Assessment. Přechod do dalšího modulu je podmíněn úspěšným dokončením Assessmentu (vyhodnocení) aktuálního modulu.
