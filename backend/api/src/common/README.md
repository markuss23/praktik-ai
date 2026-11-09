# Sdílené pomůcky (`common`)

Malé helpery, které používá víc modulů. Než napíšeš vlastní načtení s 404, kontrolu stavu kurzu nebo zápisu, podívej se sem.

## Co tu je

| Helper | Co dělá | Kdy použít |
| --- | --- | --- |
| `utils.get_or_404(db, Model, id, detail=, check_active=True)` | Načte záznam podle PK, jinak 404. Když má model `is_active`, filtruje jen aktivní. Výchozí hláška „{Model} nenalezen/a“. | Každé načtení entity podle ID v routeru/controlleru. |
| `utils.assert_course_editable(course)` | 400, pokud kurz není `draft`, `generated` nebo `edited`. | Před každou úpravou kurzu a jeho obsahu (moduly, learn bloky, testy, obrázek). |
| `utils.assert_course_open_for_students(course)` | 400, pokud kurz není aktivní, publikovaný a `approved`. | Akce studenta v kurzu (zatím jen start testu v `assessments/controllers.py`). |
| `utils.course_visible_to(db, course, user)` | `True`, když kurz smí uživatel vidět: publikovaný a aktivní každý, lektor a výš vždy, student jen když je zapsaný. | Filtrování, kde nechceš vyhodit chybu. |
| `utils.ensure_course_visible(db, course_id, user)` | Totéž, ale 404 „Kurz nenalezen“. Neprozradí, že kurz existuje. | Veřejné čtení detailu kurzu a jeho obsahu. |
| `utils.check_enrollment(db, user, course, bypass_for_owner=False)` | 403, pokud uživatel nemá aktivní zápis (`is_active`, `left_at IS NULL`). S `bypass_for_owner=True` pustí vlastníka a superadmina. | Akce vyžadující zápis (mentor chat, testy, tickety). |
| `utils.attachment_response(content, filename)` | `Response` ke stažení. `Content-Disposition` s ASCII i UTF-8 názvem (RFC 5987), MIME podle přípony. | Každé stažení souboru. Surová diakritika v hlavičce jinak skončí 500. |
| `schemas.ORMModel` | `BaseModel` s `from_attributes=True`. | Základ pro response schéma vytvářené z ORM objektu. |
| `annotations.*_ANNOTATION` | Předpřipravené `Annotated[..., Query(...)]` pro filtry (`INCLUDE_INACTIVE`, `TEXT_SEARCH`, `IS_PUBLISHED`, číselníky kurzů, filtry veřejné DB). | Query parametry listovacích endpointů, ať mají stejný popis. |

Oprávnění podle vlastnictví (`validate_owner_or_superadmin` apod.) nejsou tady, ale v `api/authorization.py`. Role (`require_role`, `is_staff`, `ROLE_HIERARCHY`) jsou v `api/dependencies.py`.

## Pozor na

- `course_visible_to` u studenta kontroluje jen existenci zápisu. Na rozdíl od `check_enrollment` neřeší `Enrollment.is_active` ani `left_at`, takže student po odchodu kurz dál vidí.
- `ensure_course_visible` načítá s `check_active=False`. Lektor a výš tak vidí i smazaný kurz.
- `get_or_404` s `check_active=True` kontroluje jen samotný záznam, ne rodiče. Aktivní modul ve smazaném kurzu projde.
- `course_visible_to` (publikovaný stačí) a `assert_course_open_for_students` (publikovaný a `approved`) se liší. Archivovaný publikovaný kurz je vidět, ale studentské akce neprojdou.
- Helpery importují `ROLE_HIERARCHY`, `Status`, `UserRole` lokálně kvůli cyklickým importům. Nepřesouvej je nahoru.
- Překlep v názvu `RESROURCE_ORIGINAL_ID_ANNOTATION`.
