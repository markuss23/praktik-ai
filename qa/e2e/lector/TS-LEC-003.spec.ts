import { test, expect } from "@playwright/test";
import { APP, prihlasit, odhlasitTlacitko } from "../pomocne";

test("TS-LEC-003 Úvodní obrazovka a navigace (Lector)", async ({ page }) => {
  // Given: uživatel je přihlášen
  await prihlasit(page, "LECTOR");

  // When: je na úvodní obrazovce
  await expect(page).toHaveURL(APP);

  // Then: zobrazí se navigace a možnost odhlášení
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(odhlasitTlacitko(page)).toBeVisible();
  // TODO: doplnit seznam položek menu podle matice oprávnění (scénář ho zatím nemá)
});
