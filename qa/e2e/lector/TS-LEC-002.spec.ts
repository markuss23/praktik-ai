import { test, expect } from "@playwright/test";
import { chybovaHlaska, odhlasitTlacitko, otevritPrihlaseni, udaje, zadatUdaje } from "../pomocne";

test("TS-LEC-002 Přihlášení s neplatným heslem (Lector)", async ({ page }) => {
  const { jmeno } = udaje("LECTOR");

  // Given: uživatel je na přihlašovací stránce
  await otevritPrihlaseni(page);

  // When: zadá platné jméno a špatné heslo (jen jeden pokus, kvůli Brute Force Detection)
  await zadatUdaje(page, jmeno, "spatne-heslo-123");

  // Then: přihlášení je odmítnuto a zobrazí se chyba
  await expect(chybovaHlaska(page)).toBeVisible();
  await expect(page.locator("#kc-form-login")).toBeVisible();
  await expect(odhlasitTlacitko(page)).toHaveCount(0);
});
