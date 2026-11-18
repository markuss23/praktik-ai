# Přispívání

Návod pro vývojáře. Jak projekt spustit pro uživatele, popisuje [README](README.cs.md#rychlý-start).

## Pravidla

1. Větev založ z `dev`. Do `main` jde jen přes PR.
2. Před pushem pusť lint (viz níže). Stejný běží v CI.
3. Když měníš schéma existující tabulky, přidej číslovaný skript do [`migrations/`](migrations/).
4. Když měníš API, vygeneruj znovu frontendového klienta.
5. Když měníš chování modulu, uprav jeho README (viz [Dokumentace modulů](#dokumentace-modulů)).

## Backend

```bash
make backend-dev      # api + db + keycloak + seaweedfs, se sestavením image
make db               # jen databáze
```

Složka `backend/` je do kontejneru připojená jako volume, změny se projeví bez rebuildu.

Lokálně bez Dockeru (DB a Keycloak musí běžet):

```bash
cd backend
uv sync
uv run ruff check .        # lint, stejný jako v CI
uv run ruff format .       # formátování
```

## Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
npm run generate:openapi    # TS klient do src/api, potřebuje běžící API
```

Klient v `frontend/src/api/` je generovaný. Needituj ho ručně.

## Migrace DB

Nové tabulky vytváří `init_db` při startu API sám. Změny existujících tabulek a převody dat dělají SQL skripty v [`migrations/`](migrations/).

- Číslují se popořadě (`0029_...sql`).
- Spouští se ručně a popořadě.
- Každý skript má v hlavičce popis a přesný příkaz.

```bash
docker exec -i praktik-ai-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction' \
  < migrations/0028_ticket_system.sql
```

## Prompty a modely agentů

Prompty a modely jsou v DB tabulce `system_setting`. Výchozí hodnoty jsou v [`backend/api/seed.py`](backend/api/seed.py). Po změně v `seed.py` je přepiš do běžící DB:

```bash
make update-settings                       # všechny klíče
make update-settings KEYS=course_planner   # jen vybrané
```

Pozor: přepíše i úpravy, které superadmin udělal v administraci.

## CI

| Workflow | Kdy běží | Co dělá |
| --- | --- | --- |
| `check_backend_lint.yml` | push do `dev` | `ruff` nad `backend/` |
| `check_frotend_audit.yml` | push do `dev`, PR do `dev`/`main` | `npm audit` frontendu |

## Dokumentace modulů

Každý modul v `backend/api/src/` má vlastní README vedle kódu. Popisuje to, co ve Swaggeru není: pojmy, stavy, oprávnění, pravidla a chytáky.

| Modul | README |
| --- | --- |
| Kurzy | [courses/](backend/api/src/courses/README.md) |
| Moduly | [modules/](backend/api/src/modules/README.md) |
| Aktivity | [activities/](backend/api/src/activities/README.md) |
| Testy (assessments) | [assessments/](backend/api/src/assessments/README.md) |
| Zápisy a postup | [enrollments/](backend/api/src/enrollments/README.md) |
| Feedback ke kurzům | [feedbacks/](backend/api/src/feedbacks/README.md) |
| Tickety | [tickets/](backend/api/src/tickets/README.md) |
| Veřejná databáze materiálů | [publicDB/](backend/api/src/publicDB/README.md) |
| Číselníky | [catalogs/](backend/api/src/catalogs/README.md) |
| Uživatelé | [users/](backend/api/src/users/README.md) |
| Přihlášení | [auth/](backend/api/src/auth/README.md) |
| Superadmin | [superadmin/](backend/api/src/superadmin/README.md) |
| Obrázky v editoru | [editor_images/](backend/api/src/editor_images/README.md) |
| Sdílené utility | [common/](backend/api/src/common/README.md) |
| API pro AI agenty | [agents/](backend/api/src/agents/README.md) |
| AI agenti (LangGraph) | [backend/agents/](backend/agents/README.md) |

Celkový obraz systému je v [docs/architecture.md](docs/architecture.md), proměnné prostředí v [docs/configuration.md](docs/configuration.md).
