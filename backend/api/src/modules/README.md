# Moduly (`modules`)

Modul je kapitola kurzu. Nese název, perex, vazby na číselníky a jeden learn blok s výukovým textem.

Kurz, jeho stavy a editovatelnost popisuje [`courses`](../courses/README.md). Learn blok řeší [`activities`](../activities/README.md), testy modulu [`assessments`](../assessments/README.md).

## Pojmy

| Pojem | Význam |
| --- | --- |
| `title` | Název modulu, 1–200 znaků. Unikátní mezi aktivními moduly kurzu (index `uq_module_course_title_active`). |
| `perex` | Krátký popis, max. 255 znaků, default `""`. |
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
| Detail modulu | jen viditelný kurz, jen aktivní | ano, i smazaný | ano, i smazaný | ano, i smazaný |
| Vytvořit modul | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |
| Upravit modul | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |
| Smazat modul | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |

- Vlastník = vlastník kurzu (`Module.get_owner_id` → `course.owner_id`). Kontrola je `validate_owner_or_superadmin`.
- Garant cizí moduly neupravuje, může k nim jen psát [feedback](../feedbacks/README.md).
- „Viditelný kurz“ = `course_visible_to`: publikovaný aktivní kurz, nebo kurz, kam je student zapsaný.
- Student bez `course_id` dostane jen moduly aktivních publikovaných kurzů. S `course_id` neviditelného kurzu dostane 404.

## Pravidla

- Vytvořit, upravit a smazat modul jde jen v editovatelném stavu kurzu (`assert_course_editable`). Jinak 400.
- Název musí být unikátní mezi aktivními moduly kurzu. Kontroluje to create i update (400), souběh chytí DB index a vrátí taky 400.
- Kurz musí být aktivní, jinak 404.
- ID principů, kompetencí a úrovní se validují proti číselníkům (400 s výpisem chybějících ID).
- Vazby se synchronizují: chybějící se deaktivují (`is_active = False`), znovu vybrané se reaktivují, nové se přidají.
- Úprava přepíše `title`, `perex` a všechny tři vazby. `course_id` změnit nejde.
- Seznam je řazený podle `course_id`, pak `module_id`. Žádné pole pro pořadí neexistuje.
- `text_search` hledá v `title` (`ILIKE`).
- Modul jde smazat přímo (`DELETE /modules/{id}`) nebo kaskádou se smazáním kurzu (`Course._soft_delete_cascade`). `Module.soft_delete` deaktivuje learn blok (i jeho záznamy mentora), vazby na číselníky a testy modulu (`CourseAssessment`). Sessions studentů zůstávají jako historie, feedbacky taky.
- Detail modulu vrací learn blok celý. Kontrola viditelnosti kurzu je proto nutná i pro studenty.
- AI generátor kurzu zakládá moduly sám (`agents/course_generator/nodes/save_to_db.py`), včetně learn bloku a pretestu. Bez platných KRAUU/Bloom kódů převezme vazby kurzu.

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | Endpointy. Řeší viditelnost pro studenty (`is_staff`, `ensure_course_visible`). |
| `controllers.py` | CRUD (smazání je soft delete), validace a sync neurovědních principů. KRAUU a Bloom sync je v `catalogs/controllers.py`. |
| `schemas.py` | `ModuleCreate`, `ModuleUpdate`, `Module` (vrací i learn bloky a rozbalené číselníky). |
| `../../models.py` | `Module`, `ModuleNeuroPrinciple`, `ModuleKrauuCompetence`, `ModuleBloomLevel`. |
