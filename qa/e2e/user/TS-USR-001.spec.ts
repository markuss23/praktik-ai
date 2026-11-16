import { test, expect } from "@playwright/test";
import { APP, odhlasitTlacitko, otevritPrihlaseni, udaje, zadatUdaje } from "../pomocne";

test("TS-USR-001 Přihlášení platného uživatele (User)", async ({ page }) => {
  const { jmeno, heslo } = udaje("USER");

  // Given: uživatel je na přihlašovací stránce
  await otevritPrihlaseni(page);

  // When: zadá platné jméno a heslo a klikne na přihlášení
  await zadatUdaje(page, jmeno, heslo);

  // Then: je přihlášen a vrácen do aplikace
  await expect(page).toHaveURL(APP);
  await expect(odhlasitTlacitko(page)).toBeVisible();
});
