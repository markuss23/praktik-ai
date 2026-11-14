import { test, expect } from "@playwright/test";
import { prihlasit, odhlasitTlacitko } from "../pomocne";

test("TS-LEC-005 Odhlášení uživatele (Lector)", async ({ page }) => {
  // Given: uživatel je přihlášen
  await prihlasit(page, "LECTOR");

  // When: klikne na Odhlásit se
  await odhlasitTlacitko(page).click();

  // Then: je odhlášen
  await expect(page.getByRole("button", { name: "Přihlásit se" }).first()).toBeVisible();

  // And: tlačítkem zpět se k chráněnému obsahu nedostane
  await page.goBack();
  await expect(odhlasitTlacitko(page)).toHaveCount(0);
});
