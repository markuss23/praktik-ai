import { defineConfig, devices } from "@playwright/test";

// Přihlašovací údaje testovacích uživatelů (soubor není v gitu); bez souboru se použijí proměnné prostředí (CI).
try {
  process.loadEnvFile(".env.test");
} catch {
  // bez souboru se použijí proměnné prostředí
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  // shortcut: lokální stack v Dockeru při paralelních workerech nestíhá (frontend padá), v CI proto 1 worker; zrušit, až se zjistí příčina.
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    // Uvítací okno (onboarding) při první návštěvě překryje stránku – označit jako viděné.
    storageState: {
      cookies: [],
      origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: "praktikai:onboarding:welcome", value: "done" }] }],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
