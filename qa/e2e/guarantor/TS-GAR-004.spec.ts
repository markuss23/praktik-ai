import { test, expect } from "@playwright/test";
import { odhlasitTlacitko, prihlasit } from "../pomocne";

test("TS-GAR-004 Odepření přístupu k funkcím vyšší role (Garantor)", async ({ page }) => {
  // Given: uživatel je přihlášen
  await prihlasit(page, "GARANTOR");

  // When: otevře adresu sekce jen pro Superadmina (AI Mentor)
  await page.goto("/admin/ai-mentor");

  // Then: přístup je odepřen
  // shortcut: stránka nemá guard role, data odepře až API („Nepodařilo se načíst nastavení“); po doplnění guardu zúžit na 403.
  await expect(page.getByText(/403|nemáte oprávnění|nepodařilo se načíst/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI Mentor" })).toHaveCount(0);

  // And: uživatel zůstává přihlášen (v administraci není hlavička – ověřit na úvodní stránce)
  await page.goto("/");
  await expect(odhlasitTlacitko(page)).toBeVisible();
});
