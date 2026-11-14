# QA – e2e testy Praktik AI

Playwright testy podle scénářů TS-*. Složky v `e2e/` odpovídají rolím:

| Složka | Role | Testy |
|---|---|---|
| `e2e/user` | Uživatel (student) | TS-USR-001 až 003, TS-USR-005 |
| `e2e/lector` | Lektor | TS-LEC-001 až 005 |
| `e2e/guarantor` | Garant | TS-GAR-001 až 005 |
| `e2e/superadmin` | Superadmin | TS-SUP-001 až 005 |

Sdílené kroky (přihlášení, odhlášení) jsou v `e2e/pomocne.ts`.

## Spuštění lokálně

```bash
cd qa
npm ci
npx playwright install chromium
cp .env.test.example .env.test   # doplnit účty testovacích uživatelů
npx playwright test --project=chromium
```

- Bez `E2E_BASE_URL` testy běží proti `http://localhost:3000` (musí běžet frontend, API i Keycloak).
- Jedna role: `npx playwright test e2e/lector --project=chromium`.
- Report: `npx playwright show-report`.

## Pro budoucí CI

Testy nepotřebují soubor `.env.test`, stačí proměnné prostředí (v CI jako secrets):

- `E2E_BASE_URL` – adresa nasazené aplikace,
- `E2E_<ROLE>_NAME` a `E2E_<ROLE>_PASSWORD` pro role `USER`, `LECTOR`, `GARANTOR` a `SUPERADMIN`.

Kroky v CI: `npm ci`, `npx playwright install --with-deps chromium`, `npx playwright test --project=chromium`. Report je ve složce `playwright-report/`.
