import { test, expect } from "@playwright/test";
import { odhlasitTlacitko, prihlasit } from "../pomocne";

test("TS-SUP-004 Přístup k administrátorským funkcím (Superadmin)", async ({ page }) => {
  // Given: Superadmin je přihlášen
  await prihlasit(page, "SUPERADMIN");

  // When: otevře administraci
  await page.goto("/admin");

  // Then: administrace se zobrazí bez chyby 403
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText("Nemáte oprávnění")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Přehled kurzů" })).toBeVisible();

  // And: uživatel zůstává přihlášen (v administraci není hlavička – ověřit na úvodní stránce)
  await page.goto("/");
  await expect(odhlasitTlacitko(page)).toBeVisible();
});
