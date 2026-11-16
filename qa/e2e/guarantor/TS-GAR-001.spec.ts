import { test, expect } from "@playwright/test";
import { APP, odhlasitTlacitko, otevritPrihlaseni, udaje, zadatUdaje } from "../pomocne";

test("TS-GAR-001 Přihlášení platného uživatele (Garantor)", async ({ page }) => {
  const { jmeno, heslo } = udaje("GARANTOR");

  // Given: uživatel je na přihlašovací stránce
  await otevritPrihlaseni(page);

  // When: zadá platné jméno a heslo a klikne na přihlášení
  await zadatUdaje(page, jmeno, heslo);

  // Then: je přihlášen a vrácen do aplikace
  await expect(page).toHaveURL(APP);
  await expect(odhlasitTlacitko(page)).toBeVisible();
});
