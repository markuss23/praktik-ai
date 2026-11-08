# Číselníky (`catalogs`)

Číselníky jsou pevné seznamy hodnot pro zařazení kurzů, modulů a materiálů veřejné DB. Tato složka je jen čte (bez přihlášení) a dává ostatním modulům validaci a synchronizaci M2M vazeb.

## Pojmy

| Číselník | Tabulka | Obsah seedu | Kde se používá |
| --- | --- | --- | --- |
| Blok | `course_block` | `blok.a` Kontext, `blok.b` Transformace, `blok.c` Aplikace | `Course.course_block_id`, `PubResource.block_id` |
| Cílová skupina | `course_target` | `target.a` Akademik, `target.s` Student, `target.m` Mentor, `target.host` Host | `Course.course_target_id`, `PubResource.target_id` |
| Obor (aprobace) | `course_subject` | `obor.01`–`obor.17` (školní předměty). Nemá `description`. | `Course.course_subject_id` (jen Blok C), `PubResource.subject_id` |
| Povinnost | `course_requirement` | `req.p` Povinný, `req.d` Doporučený, `req.v` Volitelný | `Course.course_requirement_id` |
| EQF úroveň | `course_eqf_level` | `6` Bc., `7` Mgr./Ing., `8` Ph.D. (Evropský rámec kvalifikací) | `Course.course_eqf_level_id`, `PubResource.eqf_level_id` (obojí povinné) |
| Level | `course_level` | `level.1` Vstupní, `level.2` Středně pokročilý, `level.3` Pokročilý (zkušenost s AI) | `Course.course_level_id`, `PubResource.level_id` |
| Typ kurzu | `course_type` | `type.obecny`, `type.obor`, `type.prurezovy`, `type.vstupni`, `type.spec` | `Course.course_type_id`, `PubResource.course_type_id` (obojí povinné) |
| Průřezový obor | `cross_subject` | `O01`–`O20` (AI gramotnost, etika, …) | M2M `course_cross_subject` |
| Neurovědní princip | `neuro_principle` | `NP-01`–`NP-20` | M2M `module_neuro_principle`, prompt `course_module_enricher` |
| KRAUU kompetence | `krauu_competence` | Kompetenční rámec absolventa učitelství (MŠMT 2023): 6 oblastí `x.0` + 18 kompetencí `x.y` | M2M na `Course`, `Module`, `PubResource`; prompt enricheru; kontext AI obrázku kurzu |
| Bloomova úroveň | `bloom_level` | `1` Zapamatovat … `6` Tvořit | M2M na `Course`, `Module`, `PubResource`; prompt enricheru |
| AI styl | `ai_style_axis` + `ai_style_option` | 4 osy (`ton`, `dens`, `form`, `rhet`), každá 3 nastavení, jedno `is_default` | Profil uživatele (`user_ai_style`), prompt mentora. Viz [users](../users/README.md). |

Všechny číselníky mají `code` (unikátní mezi aktivními), `name` a soft delete `is_active`.

## Oprávnění

Router je includovaný bez autentizace. Číst může kdokoliv. Zápis přes API neexistuje.

## Pravidla

- API vrací jen `is_active = true`.
- Seed (`seed_db`) plní číselník jen do prázdné tabulky. Změny číselníků v existující DB dělá SQL migrace v `migrations/`, `seed.py` je jen pro novou DB. Při změně upravit obojí.
- KRAUU: oblast je řádek bez `parent_id`, kompetence má `parent_id` na oblast. Vybírat jde jen kompetence (`validate_krauu_competence_ids`), oblast vrátí 400.
- Obor jde zadat jen u kurzu Bloku C (`validate_subject_for_block`), jinak 400.
- Průřezové obory (`resolve_cross_subject_ids`): u Bloku A a B aspoň jeden, u Bloku C zakázané (400). Bez bloku volitelné. Nejvýše 3.
- FK číselníků kurzu (blok, cílovka, obor, povinnost, EQF, level, typ) ověřuje `validate_course_catalog_ids`. Neexistující nebo neaktivní ID = 400. Volají ho `courses/controllers/create.py` a `update.py`.
- Řazení: podle `code` (blok, obor, EQF, level, neuro principy, KRAUU, Bloom, průřezové obory), podle ID (cílovka, povinnost, typ, AI osy). U těch druhých kód abecedně nedává smysl, ID drží pořadí ze seedu.
- Neurovědní principy: na modul jde přes API zadat víc (aspoň jeden). AI enricher navrhuje vždy jeden.
- `sync_m2m_links` vazby nemaže. Nechtěné nastaví `is_active = False`, chtěné reaktivuje, chybějící přidá. Commit dělá volající.
- Neplatné ID v M2M seznamu (KRAUU, Bloom, průřezové obory) vrátí 400 se seznamem chybějících ID.
- AI styl: na ose je nejvýš jedno aktivní `is_default` (index `uq_ai_style_option_default`).

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | GET seznamy všech číselníků. |
| `controllers.py` | Čtení, validace FK číselníků kurzu, KRAUU / Bloom / oboru / průřezových oborů, `sync_m2m_links` a jeho obaly. Používají ho `courses`, `modules`, `publicDB/resources`. |
| `schemas.py` | Pydantic modely. `AiStyleAxis` vnořuje `options`. |
| `../../models.py` | Tabulky číselníků a M2M vazeb. |
| `../../seed.py` | Data číselníků (`COURSE_BLOCKS`, `KRAUU_COMPETENCES`, …). |
| `../modules/controllers.py` | Validace a sync neurovědních principů (není tady). |
