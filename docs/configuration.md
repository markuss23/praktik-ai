# Konfigurace

Všechno jde přes kořenový `.env`. Šablona je v [`.env_example`](../.env_example). Vnořená nastavení backendu oddělují dvě podtržítka (`POSTGRES__HOST` → `settings.postgres.host`).

## Proměnné

| Proměnná | Povinná | Popis |
| --- | --- | --- |
| `POSTGRES__HOST`, `__PORT`, `__USER`, `__PASSWORD`, `__DB` | ano | Připojení k DB. V Dockeru `db` / `5432`, z hostu `localhost` / `5433` |
| `KEYCLOAK__SERVER_URL`, `__REALM_NAME`, `__CLIENT_ID`, `__CLIENT_SECRET` | ano | Ověřování JWT na backendu |
| `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD` | ano | Admin účet Keycloaku |
| `ANTHROPIC_API_KEY` | ano* | Pro modely `claude-*`. Výchozí modely agentů jsou Claude |
| `OPENAI_API_KEY` | ano* | Pro modely `gpt-*` a embeddingy |
| `NEXT_PUBLIC_KEYCLOAK_URL`, `_REALM`, `_CLIENT_ID`, `NEXT_API_URL` | ano | Frontend. Vkládají se při buildu image, po změně je potřeba rebuild |
| `SEAWEEDFS__MASTER_URL`, `__FILER_URL` | ne | Úložiště souborů. Výchozí hodnoty odpovídají Compose |
| `WIKI__REPO_URL`, `__LOCAL_PATH`, `__SYNC_INTERVAL_HOURS` | ne | Synchronizace GitHub wiki pro AI mentora |
| `AI_DAILY_TOKEN_LIMIT` | ne | Denní limit AI tokenů pro roli `user`. `0` = bez limitu, spotřeba se jen zaznamenává. Po překročení vrací API 429 |
| `LOG_LEVEL` | ne | Úroveň logování, výchozí `INFO` |

\* Nastav aspoň klíč k modelům, které používáš. Model se vybírá podle prefixu názvu (`claude-*` nebo `gpt-*`), viz [`backend/agents/base/llm.py`](../backend/agents/base/llm.py). Embeddingy jdou vždy přes OpenAI.

## Prompty a modely agentů

Nejsou v `.env`, ale v DB tabulce `system_setting`. Superadmin je mění v administraci. Výchozí hodnoty jsou v [`backend/api/seed.py`](../backend/api/seed.py), viz [CONTRIBUTING](../CONTRIBUTING.md#prompty-a-modely-agentů).

## Produkce

Hodnoty v `.env_example` jsou jen pro vývoj. Na produkci změň minimálně:

- `POSTGRES__PASSWORD`
- `KC_BOOTSTRAP_ADMIN_PASSWORD`
- `KEYCLOAK__CLIENT_SECRET` (a vygeneruj nový v Keycloaku)
- `NEXT_PUBLIC_KEYCLOAK_URL` na veřejnou adresu
