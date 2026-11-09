# Obrázky z editoru (`editor_images`)

Úložiště obrázků vložených do rich-text editoru na frontendu. Soubor jde do SeaweedFS a do HTML se vloží jako `<img src="/api/v1/editor-images/<název>">`.

## Pojmy

| Pojem | Význam |
| --- | --- |
| Cesta v SeaweedFS | `editor-images/<uuid4 hex><přípona>`. Přípona z MIME typu (`mimetypes.guess_extension`). |
| Záznam v DB | Žádný. Obrázek není navázaný na kurz ani uživatele. |
| Odpověď uploadu | `EditorImageUploaded { url }`, relativní URL na veřejný endpoint. |

## Oprávnění

| Akce | Kdo |
| --- | --- |
| Nahrát (`POST /editor-images`) | Každý přihlášený (`require_role("user")`). |
| Zobrazit (`GET /editor-images/{filename}`) | Kdokoliv bez přihlášení. `<img>` neposílá auth hlavičku. |

## Pravidla

- Povolené typy: JPEG, PNG, WebP, GIF. Jinak 415.
- Max. 10 MB. Větší = 413.
- SVG záměrně ne. Soubory jsou veřejné a SVG může nést skript (stored XSS).
- Název souboru při čtení nesmí obsahovat `/` ani `..` (400). Chybějící soubor = 404.
- Odpověď nese `X-Content-Type-Options: nosniff` a `Content-Security-Policy: ... sandbox`. Chrání i dřív nahraná SVG.
- Obrázek se neupravuje (žádný resize ani převod).

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | `router` (upload, s přihlášením) a `public_router` (čtení). |
| `controllers.py` | Validace, upload a stažení ze SeaweedFS. Limity jsou konstanty nahoře. |
| `schemas.py` | `EditorImageUploaded`. |

## Pozor na

- Typ se bere z hlavičky `Content-Type`, kterou posílá klient. Obsah souboru se nekontroluje.
- Celý soubor se načte do paměti a teprve pak se kontroluje velikost.
- Obrázky se nikdy nemažou. Po smazání z editoru nebo kurzu zůstanou v SeaweedFS.
- Nahrát smí i student. Upload není vázaný na roli lektora ani na kurz.
- Kdo zná URL, obrázek vidí, i když je v nepublikovaném kurzu.
