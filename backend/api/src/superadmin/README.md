# Superadmin (`superadmin`)

Správa systémových nastavení AI agentů (model a prompt) a přehled konverzací s AI mentorem. Celá složka je jen pro roli `superadmin`.

## Pojmy

| Pojem | Význam |
| --- | --- |
| `SystemSetting` | Řádek tabulky `system_setting`: `key`, `name`, `model`, `prompt`, `description`. Jeden řádek = konfigurace jednoho AI kroku. |
| `key` | Identifikátor, podle kterého agent nastavení čte (`get_llm_config` v `agents/base/llm.py`). Unikátní mezi aktivními (`uq_system_setting_key`). |
| `model` | Název LLM modelu, např. `claude-opus-5-5`. U `image_generator_model` OpenAI image model. |
| `prompt` | Systémový prompt. U některých klíčů se nečte. |
| `MentorInteractionLog` | Jedna otázka a odpověď AI mentora: uživatel, kurz, learn blok, `scope`, zpráva, odpověď. Zapisuje `agents/routers.py` po každém chatu. |

Které klíče existují, který agent je čte a kde je prompt doopravdy, popisuje [agents/README.md](../../../agents/README.md#výběr-modelu-a-prompty).

## Oprávnění

| Akce | Kdo |
| --- | --- |
| Číst a měnit nastavení | `superadmin` |
| Číst mentor logy | `superadmin` |

## Pravidla

- Seznam nastavení vrací jen aktivní řádky, řazené podle `key`.
- Úprava mění jen `name`, `model`, `prompt`, `description`. Pole, která v požadavku nejsou, zůstanou. `key` změnit nejde.
- Změna se projeví hned při dalším volání agenta (čte se z DB pokaždé).
- Mentor logy jsou jen aktivní, nejnovější první, volitelný filtr `user_id`.

## Odkud se nastavení berou

| Cesta | Co dělá |
| --- | --- |
| `seed_db()` (`api/seed.py`, `SYSTEM_SETTINGS`) | Při startu aplikace. Naplní tabulku **jen když je prázdná**. |
| `python -m scripts.update_system_settings [key…]` (z `backend/`) | Přepíše existující klíče hodnotami ze seedu a doplní chybějící. |
| SQL migrace v `migrations/` | Např. `0010_system_setting_image_generator_model.sql`, `0018_pretest_prompt.sql`. |
| `PUT` v tomto modulu | Ruční úprava existujícího řádku z admin UI. |

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | Mentor logy, seznam a úprava nastavení. Router má `require_role("superadmin")`. |
| `controllers.py` | Dotazy a update. |
| `schemas.py` | `SystemSettingResponse`, `SystemSettingUpdate`, `MentorInteractionLogItem`. |
| `../../seed.py` | `SYSTEM_SETTINGS` – výchozí modely a prompty. |
| `../../../scripts/update_system_settings.py` | Propsání seedu do existující DB. |
| `../../../agents/base/llm.py` | `get_llm_config`, výběr třídy LLM podle modelu. |

## Pozor na

- `update_system_settings` přepíše ruční úpravy z admin UI u dotčených klíčů.
- Přidat nebo smazat nastavení přes API nejde. Klíče, které v seedu chybí (`image_generator_prompt`, `module_image_generator_prompt`), se z UI vytvořit nedají, agent pak jede na defaultu v kódu.
- `model` se nevaliduje. Překlep se ukáže až chybou při běhu agenta.
- Explicitní `null` v těle (`{"prompt": null}`) projde schématem, ale sloupce jsou `NOT NULL`. Výsledek je 400 „Porušení integritního omezení databáze“.
- U mentor klíčů (`mentor_router`, `mentor_reranker`, `mentor_answer`) se `prompt` nečte, prompty jsou v souborech `agents/mentor/*.md`. Úprava promptu v UI nemá efekt.
- Mentor logy nemají stránkování, vrací se všechno.
