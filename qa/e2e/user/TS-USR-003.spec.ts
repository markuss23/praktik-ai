import { test, expect } from "@playwright/test";
import { chybovaHlaska, odhlasitTlacitko, otevritPrihlaseni } from "../pomocne";

test("TS-USR-003 Přihlášení s prázdnými údaji (User)", async ({ page }) => {
  // Given: uživatel je na přihlašovací stránce s prázdnými poli
  await otevritPrihlaseni(page);

  // When: klikne na přihlášení bez vyplnění
  await page.locator("#kc-login").click();

  // Then: zůstane na přihlašovací stránce a není přihlášen
  await expect(page.locator("#kc-form-login")).toBeVisible();
  await expect(odhlasitTlacitko(page)).toHaveCount(0);
  await expect(chybovaHlaska(page)).toBeVisible();
});
