import { expect, type Page } from "@playwright/test";

// Role odpovídají proměnným v .env.test, např. E2E_USER_NAME / E2E_USER_PASSWORD.
export type Role = "USER" | "LECTOR" | "GARANTOR" | "SUPERADMIN";

// Adresa aplikace (lokál nebo dev server) – stejná jako baseURL v playwright.config.ts.
const BASE = process.env.E2E_BASE_URL ?? process.env.MANUAL_BASE_URL ?? "http://localhost:3000";
export const APP = new RegExp("^" + BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

export function udaje(role: Role) {
  return {
    jmeno: process.env[`E2E_${role}_NAME`] ?? "",
    heslo: process.env[`E2E_${role}_PASSWORD`] ?? "",
  };
}

// Z úvodní stránky aplikace přejde na přihlašovací stránku Keycloak.
export async function otevritPrihlaseni(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Přihlásit se" }).first().click();
  await expect(page.locator("#kc-form-login")).toBeVisible();
}

export async function zadatUdaje(page: Page, jmeno: string, heslo: string) {
  await page.locator("#username").fill(jmeno);
  await page.locator("#password").fill(heslo);
  await page.locator("#kc-login").click();
}

// Celé přihlášení platným uživatelem dané role.
export async function prihlasit(page: Page, role: Role) {
  const { jmeno, heslo } = udaje(role);
  await otevritPrihlaseni(page);
  await zadatUdaje(page, jmeno, heslo);
  await expect(odhlasitTlacitko(page)).toBeVisible();
}

export function odhlasitTlacitko(page: Page) {
  return page.getByRole("button", { name: "Odhlásit se" });
}

// Chybová hláška na přihlašovací stránce Keycloak.
export function chybovaHlaska(page: Page) {
  return page.locator(".alert-error, #input-error, .kc-feedback-text");
}

// Testovací kurz pro životní cyklus kurzu (TS-KUR-008 až 015). Název lze přepsat přes E2E_KURZ.
export const KURZ = process.env.E2E_KURZ ?? "Ukázkový kurz – Základy AI";
export const PODKLAD = process.env.E2E_PODKLAD ?? "e2e/data/zaklady-ai.md";
export const POPIS =
  process.env.E2E_POPIS ??
  "Úvod do umělé inteligence pro budoucí učitele: co je AI, jak funguje strojové učení a jak AI bezpečně používat ve výuce.";

// Akce kurzu jsou tlačítka přímo v posledním sloupci řádku (Úpravy, Rychlé úpravy, Odeslat ke schválení…).
export function akceKurzu(page: Page, nazev: string, stav?: string | RegExp) {
  return radekKurzu(page, nazev, stav).getByRole("cell").last();
}

// Řádek kurzu v přehledu kurzů administrace; nejnovější první.
// Řádky tabulky mají role="button" (kliknutím se rozbalí), proto tbody tr, ne getByRole("row").
export function radekKurzu(page: Page, nazev: string, stav?: string | RegExp) {
  const radky = page.locator("tbody tr").filter({ has: page.getByRole("cell", { name: nazev, exact: true }) });
  return (stav ? radky.filter({ has: page.getByRole("cell", { name: stav, exact: true }) }) : radky).first();
}

// Tabulka kurzů nejdřív ukazuje prázdné skeleton řádky – počkat, až má první řádek text.
export async function pockatNaKurzy(page: Page) {
  await expect(page.locator("tbody tr").first().getByRole("cell").first()).not.toBeEmpty({ timeout: 30_000 });
}

// shortcut: odpovědi platí pro modul 1 kurzu „Ukázkový kurz – Základy AI“ vygenerovaného z data/zaklady-ai.md;
// AI generuje otázky pokaždé jinak – po novém vygenerování kurzu je zde aktualizujte.
export const ODPOVEDI_MODUL_1 = {
  uzavrene: [/^Model se učí z příkladů \(dat\)/, /^Jde o učení bez učitele/],
  otevrena:
    "(1) Jde o učení s učitelem, protože se model učil z e-mailů označených jako spam nebo ne spam. " +
    "(2) Závěr nestačí: výměna modelu nepomůže, pokud jsou chybná nebo nevyvážená trénovací data. " +
    "(3) Kvalita modelu závisí na kvalitě dat – chybná označení model převezme, proto je potřeba nejdřív zkontrolovat a opravit data.",
};

// Student otevře první modul kurzu z detailu kurzu (musí být do kurzu zapsán).
export async function otevritPrvniModul(page: Page, nazevKurzu: string) {
  await page.goto("/courses");
  await page.getByRole("link", { name: new RegExp(nazevKurzu) }).first().click();
  await expect(page.getByRole("heading", { name: nazevKurzu, level: 1 })).toBeVisible();
  await page.locator('a[href^="/modules/"]').first().click();
  await expect(page).toHaveURL(/\/modules\/\d+/);
}

// Projde příručku až po tlačítko „Dokončit příručku“ (víc částí → „Pokračovat“).
export async function dokoncitPrirucku(page: Page) {
  const dokoncit = page.getByRole("button", { name: "Dokončit příručku" });
  const dalsi = page.getByRole("button", { name: /^Pokračovat/ });
  await expect(dokoncit.or(dalsi).first()).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 30 && !(await dokoncit.isVisible()); i++) await dalsi.click();
  await dokoncit.click();
}

// Vyplní a odevzdá procvičování modulu 1 správnými odpověďmi a počká na vyhodnocení (otevřenou odpověď hodnotí AI).
export async function odevzdatProcvicovani(page: Page) {
  for (const odpoved of ODPOVEDI_MODUL_1.uzavrene) await page.getByRole("radio", { name: odpoved }).check();
  await page.getByPlaceholder("Napište svou odpověď...").fill(ODPOVEDI_MODUL_1.otevrena);
  await page.getByRole("button", { name: "Odevzdat" }).click();
  await expect(page.getByRole("heading", { name: "Vyhodnocení" })).toBeVisible({ timeout: 180_000 });
}

// Ukázková data na dev serveru, nad kterými běží testy @prirucka (snímky příručky):
// KURZ_STUDENT – schválený, publikovaný, student zapsán, modul 1 splněn (TS-KUR-008 až 014)
// KURZ_KONTROLA – lektorův kurz ke schválení s komentářem garanta (TS-KUR-008, 009)
// KURZ_UPRAVY – lektorův kurz vrácený garantem k úpravám s komentářem (TS-KUR-008, 009, TS-GAR-008)
export const KURZ_STUDENT = "Ukázkový kurz – Základy AI";
export const KURZ_KONTROLA = "Ukázkový kurz – AI ve výuce";
export const KURZ_UPRAVY = "Ukázkový kurz – AI v praxi učitele";

// Proměnlivé údaje na snímcích: relativní čas a tikety s časovým razítkem z TS-USR-007.
export function promenne(page: Page) {
  return [page.getByText(/^(Právě teď|před \d+.*)$/i), page.getByText(/Dotaz k modulu \d+/)];
}

export function kartaKurzu(page: Page, nazev = KURZ_STUDENT) {
  return page.getByRole("link", { name: new RegExp(nazev) }).first();
}

// Detail kurzu z Přehledu kurzů.
export async function otevritKurz(page: Page, nazev = KURZ_STUDENT) {
  await page.goto("/courses");
  await kartaKurzu(page, nazev).click();
  await expect(page.getByRole("heading", { name: nazev, level: 1 })).toBeVisible();
}

// První modul ukázkového kurzu studenta (modul je splněný, všechny záložky jsou odemčené).
export async function otevritModul1(page: Page) {
  await otevritKurz(page, KURZ_STUDENT);
  await page.locator('a[href^="/modules/"]').first().click();
  await expect(page.getByRole("button", { name: /^Příručka/ })).toBeVisible({ timeout: 30_000 });
}

// Editor kurzu (Přehled kurzů → Úpravy → Editovat kurz), volitelně na daném kroku průvodce.
export async function editorKurzu(page: Page, nazev: string, krok?: RegExp) {
  await page.goto("/admin?view=courses");
  await pockatNaKurzy(page);
  // přehled si pamatuje rozbalený řádek – další klik na Úpravy by ho sbalil
  const editovat = page.getByRole("button", { name: "Editovat kurz" });
  if (!(await editovat.isVisible())) await radekKurzu(page, nazev).getByRole("button", { name: "Úpravy", exact: true }).click();
  await editovat.click();
  const kroky = page.getByRole("navigation", { name: "Tvorba kurzu" });
  await expect(kroky).toBeVisible({ timeout: 30_000 });
  // aktuální krok je v navigaci neaktivní – klikat jen na jiný
  const tl = krok && kroky.getByRole("button", { name: krok });
  if (tl && (await tl.isEnabled())) await tl.click();
}

// Garant otevře kontrolu kurzu ze seznamu Obsah ke schválení.
export async function kontrolaKurzu(page: Page, nazev: string) {
  await page.goto("/admin/review");
  await page.getByRole("button", { name: new RegExp(`^Ke kontrole ${nazev} `) }).first().getByRole("button", { name: /^Zkontrolovat/ }).click();
  await expect(page.getByRole("heading", { name: "Kontrola kurzu" })).toBeVisible();
}
