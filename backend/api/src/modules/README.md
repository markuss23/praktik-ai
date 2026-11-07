# Moduly (`modules`)

Modul je kapitola kurzu. Nese název, perex, vazby na číselníky a jeden learn blok s výukovým textem.

Kurz, jeho stavy a editovatelnost popisuje [`courses`](../courses/README.md). Learn blok řeší [`activities`](../activities/README.md), testy modulu [`assessments`](../assessments/README.md).

## Pojmy

| Pojem | Význam |
| --- | --- |
| `title` | Název modulu, 1–200 znaků. Unikátní mezi aktivními moduly kurzu (index `uq_module_course_title_active`). |
| `perex` | Krátký popis, max. 255 znaků, default `""`. |
| `max_task_attempts` | Max. počet pokusů pro splnění modulu, 1–20, default 3. |
| `passing_score` | Sloupec v DB (default 75). API ho nečte ani nemění. |
| Neurovědní principy | M2M `ModuleNeuroPrinciple`. Aspoň jeden, jen aktivní principy. |
| KRAUU kompetence | M2M `ModuleKrauuCompetence`. Aspoň jedna. Jen kompetence (řádek s `parent_id`), oblasti ne. |
| Bloomovy úrovně | M2M `ModuleBloomLevel`. Aspoň jedna, jen aktivní. |
| `learn_blocks` | Aktivní learn bloky modulu (relace filtruje `is_active`). V praxi max. jeden. |
| `is_active` | Soft delete. |

## Oprávnění

Všechny endpointy vyžadují přihlášení. Zápisy vyžadují roli aspoň `lector` (`require_role`).

| Akce | `user` | `lector` (vlastník kurzu) | `guarantor` (cizí kurz) | `superadmin` |
| --- | --- | --- | --- | --- |
| Seznam modulů | jen viditelné kurzy, jen aktivní | vše, i neaktivní (`include_inactive`) | vše | vše |
| Detail modulu | jen viditelný kurz | ano | ano | ano |
| Vytvořit modul | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |
| Upravit modul | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |
| Smazat modul | ne | ne | ne | ne (endpoint je zakomentovaný) |

- Vlastník = vlastník kurzu (`Module.get_owner_id` → `course.owner_id`). Kontrola je `validate_owner_or_superadmin`.
- „Viditelný kurz“ = `course_visible_to`: publikovaný aktivní kurz, nebo kurz, kam je student zapsaný.
- Student bez `course_id` dostane jen moduly aktivních publikovaných kurzů. S `course_id` neviditelného kurzu dostane 404.

## Pravidla

- Vytvořit a upravit modul jde jen v editovatelném stavu kurzu (`assert_course_editable`). Jinak 400.
- Kurz musí být aktivní, jinak 404.
- ID principů, kompetencí a úrovní se validují proti číselníkům (400 s výpisem chybějících ID).
- Vazby se synchronizují: chybějící se deaktivují (`is_active = False`), znovu vybrané se reaktivují, nové se přidají.
- Úprava přepíše `title`, `perex`, `max_task_attempts` a všechny tři vazby. `course_id` změnit nejde.
- Seznam je řazený podle `course_id`, pak `module_id`. Žádné pole pro pořadí neexistuje.
- `text_search` hledá v `title` (`ILIKE`).
- Moduly se mažou kaskádou se smazáním kurzu (`Course._soft_delete_cascade`). `Module.soft_delete` pak deaktivuje learn bloky a vazby na číselníky.
- AI generátor kurzu zakládá moduly sám (`agents/course_generator/nodes/save_to_db.py`), včetně learn bloku a pretestu. Bez platných KRAUU/Bloom kódů převezme vazby kurzu.

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | Endpointy. Řeší viditelnost pro studenty (`is_staff`, `ensure_course_visible`). |
| `controllers.py` | CRUD, validace a sync neurovědních principů. KRAUU a Bloom sync je v `catalogs/controllers.py`. |
| `schemas.py` | `ModuleCreate`, `ModuleUpdate`, `Module` (vrací i learn bloky a rozbalené číselníky). |
| `../../models.py` | `Module`, `ModuleNeuroPrinciple`, `ModuleKrauuCompetence`, `ModuleBloomLevel`. |

## Pozor na

- Vytvoření modulu nekontroluje unikátnost názvu. Duplicitní název spadne až na DB indexu (500 místo 400). Úprava ho kontroluje.
- Detail (`get_module`) načítá i neaktivní moduly (`check_active=False`). Kdo vidí kurz, vidí i smazaný modul.
- Detail modulu vrací learn blok celý. Kontrola viditelnosti kurzu je proto nutná i pro studenty.
- `delete_module` v controlleru existuje, ale endpoint je zakomentovaný. Navíc nastavuje jen `is_active = False` bez kaskády a bez kontroly oprávnění.
- `max_task_attempts` se jen ukládá. Žádný jiný kód ho nečte.
- Docstring `update_module` mluví o přehazování pozic. Pozice v modelu není.
- Garant cizí moduly neupravuje, může k nim jen psát [feedback](../feedbacks/README.md).
