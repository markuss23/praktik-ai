# Instrukce pro automatickou obnovu příručky „Jak vytvořit kurz"

Tento soubor řídí GitHub Actions workflow `.github/workflows/refresh-course-manual.yml`.
Jeho obsah se předává Claude Code jako `prompt` a nejsou to instrukce od uživatele v
běžném slova smyslu — je to skript pro repeatable úlohu. Neuprošuj se, projeď přesně
tyto kroky a nikam jinam v repu nezasahuj.

## Cíl

Aktualizovat screenshoty (a případně text) v `docs/manuals/jak-vytvorit-kurz/README.md`
tak, aby odpovídaly aktuálnímu vzhledu UI pro tvorbu kurzu pomocí AI.

## Vstupy

- URL prostředí: env proměnná `DOCS_ENV_URL`
- Přihlašovací jméno: env proměnná `DOCS_ENV_USERNAME`
- Heslo: env proměnná `DOCS_ENV_PASSWORD`
- Podkladový soubor pro nahrání: `docs/manuals/jak-vytvorit-kurz/fixtures/prehled_kavy.docx`
  (statická fixture v repu — nepoužívej žádný jiný soubor, ať jsou běhy reprodukovatelné)

## Postup

0. Zjisti hodnoty proměnných prostředí příkazy `printenv DOCS_ENV_URL`,
   `printenv DOCS_ENV_USERNAME` a `printenv DOCS_ENV_PASSWORD` (jsou to jediné
   povolené Bash příkazy). Heslo dál nikam nevypisuj ani neukládej — použij ho jen
   k vyplnění přihlašovacího formuláře.
1. Otevři URL z `DOCS_ENV_URL` v prohlížeči (playwright MCP), klikni na „Přihlásit se"
   a přihlas se hodnotami z `DOCS_ENV_USERNAME` / `DOCS_ENV_PASSWORD`.
2. Přejdi do `Admin` → `Kurzy` (`/admin`). Ulož screenshot přehledu kurzů s tlačítkem
   „Přidat kurz" jako `docs/manuals/jak-vytvorit-kurz/images/01-admin-pridat-kurz.png`.
3. Otevři tvorbu kurzu pomocí AI (přímá navigace na `/admin?view=course-ai-create`, pokud
   kliknutí na dropdown menu tlačítka „Přidat kurz" nic nezobrazí — je to známá vlastnost
   této komponenty). Ulož prázdný formulář jako `02-popis-kurzu-prazdny.png`.
4. Vyplň formulář testovacími daty s tématem "Přehled kávy" (nebo podobným, odpovídajícím
   fixture souboru): název kurzu, tematický blok, cílová skupina, obor, popis, počet
   modulů, obtížnost, délka. Ulož vyplněný formulář jako `03-popis-kurzu-vyplneny.png`.
5. Nahraj `docs/manuals/jak-vytvorit-kurz/fixtures/prehled_kavy.docx` do pole „Nahrát
   podklady". Kliknutí na dropzónu neotevře systémový file picker (v headless CI to
   nefunguje) — použij rovnou nástroj `browser_run_code_unsafe` a v něm zavolej
   `page.locator('input[type=file]').setInputFiles('docs/manuals/jak-vytvorit-kurz/fixtures/prehled_kavy.docx')`.
   Element nemusíš nijak odkrývat, `setInputFiles` funguje i na skrytém inputu.
   (Poznámka: `browser_evaluate` na tohle nepoužívej — běží jen v kontextu stránky a
   `setInputFiles` je Playwright/Node API, ne DOM API.) Ulož screenshot s nahraným
   souborem jako `04-nahrany-soubor.png`.
6. Klikni na „Pokračovat". Pozor: tlačítka v této aplikaci občas nereagují na běžný
   Playwright `.click()` (pravděpodobně kvůli způsobu, jakým komponenta naslouchá
   událostem) — pokud se po kliknutí nic nestane (žádný nový network request), zkus
   trigger přes `browser_evaluate`, který najde tlačítko podle textu a zavolá na něm
   `.click()` přímo v DOM.
7. Počkej na dokončení AI generování (může trvat několik minut, polluj v ~20s
   intervalech). Zachyť screenshot progress dialogu (kroky 1–5) jako
   `05-ai-generuje.png`.
8. Po dokončení tě aplikace přesměruje na `Tvorba obsahu kurzu`. Ulož screenshot fáze
   „Podklady" jako `06-tvorba-obsahu.png`.
9. Přejdi do fáze „Testy" (tlačítko „Uložit a pokračovat", případně stejný trik s
   `browser_evaluate`, pokud běžný klik nezabere). Ulož screenshot jako
   `07-tvorba-testu.png`.
10. Dokonči test (tlačítko „Dokončit") a na stránce „Souhrn" ulož screenshot jako
    `08-souhrn-kurzu.png`.
11. Klikni na „Dokončit". V přehledu kurzů najdi nově vytvořený kurz, klikni na
    „Odeslat ke schválení" a potvrď dialog. Ulož výsledný stav (badge „Ke schválení")
    jako `09-ke-schvaleni.png`.
12. Smaž nebo archivuj takto vytvořený testovací kurz, pokud to UI umožňuje, aby se
    v přehledu kurzů nehromadily testovací záznamy z každého běhu. Pokud to není
    snadno možné, tento krok přeskoč a nech to na člověku, který PR bude revidovat —
    nezkoušej mazat nic přes API.

## Aktualizace README.md

- Nahraď staré PNG soubory v `docs/manuals/jak-vytvorit-kurz/images/` nově
  pořízenými (stejné názvy souborů, stejné pořadí kroků).
- Pokud se text tlačítek, názvy fází nebo pořadí kroků v UI změnily natolik, že
  popisky v `README.md` již neodpovídají realitě, uprav příslušné odstavce — ale
  neměň strukturu dokumentu (nadpisy, pořadí kroků) ani tón textu.
- Než začneš upravovat obsah, přečti si aktuální `README.md` celý a zkontroluj, že
  každý odstavec dává smysl a popisuje to, co skutečně vidíš v UI daného kroku. Pokud
  narazíš na text, který je zjevně poškozený, nesmyslný nebo neodpovídá popisovanému
  kroku (překlepy, náhodné znaky, vymazaný/přepsaný odstavec apod.), oprav ho — napiš
  znovu věcný popis daného kroku na základě toho, co v UI skutečně vidíš, ve stejném
  stylu jako okolní text. Tohle plať i tehdy, když se samotné UI oproti předchozímu
  běhu nezměnilo.
- Pokud po tomhle průchodu nezůstává nic k opravě (ani obrázky, ani text), README.md
  nech beze změny.

## Na závěr

Nic sám necommituj ani nepushuj — o vytvoření větve, commitu a PR se stará
následující krok workflow (`gh pr create` přes vestavěné GitHub CLI). Tvým jediným
úkolem je mít v pracovním stromu aktuální soubory.
