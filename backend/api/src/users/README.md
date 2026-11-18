# Uživatelé (`users`)

Přehled uživatelů a jejich rolí pro superadmina a logika AI stylu komunikace. Uživatele zakládá a role mu nastavuje přihlášení přes Keycloak, viz [auth](../auth/README.md).

## Pojmy

| Pojem | Význam |
| --- | --- |
| `User` | Kopie uživatele z Keycloaku: `sub`, `email`, `display_name`, `role`, `last_synced_at`, `is_active`. |
| `role` | `user`, `lector`, `guarantor`, `superadmin`. Zdroj pravdy je Keycloak realm role, do DB se synchronizuje. |
| AI styl | Jak má AI mentor mluvit. 4 osy (`ton`, `dens`, `form`, `rhet`), na každé jedno nastavení. Číselník je v [catalogs](../catalogs/README.md). |
| `UserAiStyle` | Volba uživatele na jedné ose. Chybějící řádek = výchozí nastavení osy (`is_default`). |

## Oprávnění

| Akce | Kdo |
| --- | --- |
| Seznam uživatelů, role uživatele | jen `superadmin` (`require_role` na routeru) |
| Číst / měnit vlastní AI styl | přihlášený, endpointy jsou v `auth/routers.py` (`/auth/profile/ai-style`) |

Role ani aktivitu uživatele přes API změnit nejde. Role se mění v Keycloaku, `is_active` jen v DB.

## Pravidla

- Seznam vrací jen aktivní uživatele, řazené podle `user_id`.
- `get_user_ai_style` vrací pro každou aktivní osu jedno nastavení: zvolené, jinak výchozí. Osa bez výchozího a bez volby se vynechá.
- Zvolené nastavení, které je mezitím neaktivní, se nahradí výchozím.
- `update_user_ai_style` bere `{kód osy: kód nastavení}`. Neuvedené osy se nemění. Nastavení musí být aktivní a patřit k uvedené aktivní ose, jinak 400 se seznamem chyb. Nic se neuloží, když je chybná jakákoliv dvojice.
- Na uživatele a osu je max. jeden řádek (`uq_user_ai_style_user_axis`). Změna přepíše `option_id`.
- Mentor čte AI styl přes `get_user_ai_style` a `description` nastavení dává do promptu (`agents/mentor/nodes/load_learn_block_data.py`).

## Soubory

| Soubor | Co dělá |
| --- | --- |
| `routers.py` | Seznam uživatelů, role uživatele. Celý router jen pro superadmina. |
| `controllers.py` | `list_users`, `get_user_role`, `get_user_ai_style`, `update_user_ai_style`. |
| `schemas.py` | `UserWithRole`, `UserRoleResponse`. |
| `../auth/routers.py` | Profil přihlášeného uživatele (jméno, AI styl). |
| `../../dependencies.py` | Sync uživatele a role z Keycloaku. |

## Pozor na

- AI styl logicky patří k profilu, ale controller je tady a endpoint v `auth`.
- Vypnutí uživatele (`is_active = False`) jde jen přímo v DB. Pak dostane 403 a zmizí ze seznamu. `get_user_role` vrátí 404 (`get_or_404` filtruje `is_active`).
- Role v DB může být až 5 minut stará oproti Keycloaku.
- `update_user_ai_style` s prázdným `{}` nic nedělá a vrátí 200.
