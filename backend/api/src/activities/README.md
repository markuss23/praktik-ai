# Aktivity (`activities`)

Složka zatím obsahuje jen learn blok, tedy výukový text modulu. Tady se learn blok vytváří, upravuje a maže.

Čtení learn bloku vlastní endpoint nemá. Vrací se v detailu a seznamu modulů (`Module.learn_blocks`), viz [`modules`](../modules/README.md). Stavy kurzu viz [`courses`](../courses/README.md).

## Pojmy

| Pojem | Význam |
| --- | --- |
| `LearnBlock` | Výukový text modulu. Pole `title` (1–200 znaků) a `content` (text bez limitu). |
| `learn_id` | Primární klíč learn bloku. |
| `is_active` | Soft delete. |

## Oprávnění

Celý router vyžaduje roli aspoň `lector`. Pak platí `validate_owner_or_superadmin` nad vlastníkem kurzu.

| Akce | `user` | `lector` (vlastník kurzu) | `guarantor` (cizí kurz) | `superadmin` |
| --- | --- | --- | --- | --- |
| Vytvořit | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |
| Upravit | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |
| Smazat | ne | ano, v editovatelném stavu | ne | ano, v editovatelném stavu |

## Pravidla

- Modul má nejvýše jeden aktivní learn blok. Hlídá to controller (400) i DB (`uq_learnblock_module_active`).
- Modul musí být aktivní, jinak 404.
- Všechny zápisy jen v editovatelném stavu kurzu (`assert_course_editable`), jinak 400.
- Při vytvoření je `content` nepovinný (default `""`). Při úpravě jsou `title` i `content` povinné a oba se přepíšou.
- Smazání je soft delete. Kaskádově deaktivuje záznamy mentora (`MentorInteractionLog`) s tímto `learn_id`, i ty se `scope=course`. Pak jde modulu založit nový learn blok.
- AI generátor kurzu zakládá learn blok ke každému modulu sám, s názvem modulu (`agents/course_generator/nodes/save_to_db.py`).
- `content` čtou AI formáty testů, mentor, embeddingy a generátor obrázků modulu.

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | Endpointy pod `/activities/learn-blocks`. |
| `controllers.py` | Vytvoření, úprava, soft delete. |
| `schemas.py` | `LearnBlockCreate`, `LearnBlockUpdate`, `LearnBlock`. |
| `../../models.py` | `LearnBlock`. |
