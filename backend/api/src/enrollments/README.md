# Zápisy (`enrollments`)

Zápis uživatele do kurzu a jeho průběh. Postup v kurzu se neukládá. Počítá se živě z assessment sessions přes `course_completion`.

## Pojmy

| Pojem | Význam |
| --- | --- |
| zápis | Řádek `Enrollment` (`user_id`, `course_id`). |
| aktivní zápis | `is_active = True` a `left_at IS NULL`. Jen ten pouští k testům (`check_enrollment`). |
| `left_at` | Čas odepsání. Nastaví ho student sám (leave) nebo vlastník kurzu (remove). |
| `removed_by_id` | Kdo studenta vyřadil (remove). U leave `NULL`. Vrací ho seznam zápisů, takže jde odlišit leave od remove. |
| `is_active = False` | Soft delete zápisu. Jen superadmin. |
| `completed_at` | Kdy student dokončil kurz. Nastaví ho assessments při `passed` session, u kurzu bez povinných testů `my_enrollments`. |
| hotový modul | Modul, kde má student `passed` session na všech povinných (`is_required`) zapnutých konfiguracích. |
| hotový kurz | Všechny aktivní moduly hotové + hotový povinný `course_final`, pokud existuje. |
| `last_visited_module_id` / `last_activity_at` | Kde student naposledy byl. Pro „Pokračuj, kde jsi skončil“. |
| `next_module` | První nehotový modul (řazeno podle `module_id`). `None` = vše hotovo. |

## Tok

```mermaid
stateDiagram-v2
    [*] --> aktivni: create_enrollment
    state aktivni {
        [*] --> rozpracovany
        rozpracovany --> rozpracovany: passed session / visit modulu
        rozpracovany --> dokonceny: passed session dokončí kurz (completed_at)
    }
    aktivni --> odepsany: leave / remove (left_at)
    odepsany --> aktivni: create_enrollment (obnova)
    aktivni --> deaktivovany: soft delete (is_active = False)
    odepsany --> deaktivovany: soft delete
```

Odepsaný zápis jde obnovit přes `create_enrollment` (vynuluje `left_at` a `removed_by_id`). Postup se počítá ze sessions, takže se vrátí sám. Z `deaktivovany` se vrátit nejde (409).

Vazba na assessments:

1. `start_session` a `submit_answer` volají `check_enrollment`. Bez aktivního zápisu = 403.
2. Gate `PREREQUISITES`: `pretest` → `practice` → `assessment` → `course_final`. Počítají se jen povinné zapnuté konfigurace.
3. Při `passed` session volá `submit_answer` funkci `mark_course_completed`. Ta přepočítá `course_completion` a při hotovém kurzu zapíše `completed_at`.
4. `completed_at` = čas splnění posledního povinného testu, ne čas výpočtu.

## Oprávnění

| Akce | user | lector | guarantor | superadmin |
| --- | --- | --- | --- | --- |
| Zapsat sebe | ano | ano | ano | ano |
| Zapsat jiného uživatele | ne | ne | ano | ano |
| Obnovit zápis po leave | sám sebe | sám sebe | kohokoliv | kohokoliv |
| Obnovit zápis po remove | ne | ne | kohokoliv | kohokoliv |
| Odepsat se (leave) | vlastní zápis | vlastní zápis | vlastní zápis | vlastní zápis |
| Moje zápisy, visit, aktivita | ano | ano | ano | ano |
| Seznam všech zápisů | ne | ano, všechny kurzy (vlastnictví se nekontroluje) | ano | ano |
| Seznam včetně neaktivních | ne | ne | ne | ano |
| Vyřadit studenta (remove, `left_at` + `removed_by_id`) | ne | jen z vlastního kurzu | jen z vlastního kurzu | ano |
| Soft delete zápisu | ne | ne | ne | ano |

## Pravidla

- Zapsat se jde jen do kurzu, který je aktivní, publikovaný a `approved`. Jinak 400 nebo 404.
- Jeden uživatel má na kurz jeden zápis. Aktivní nebo deaktivovaný zápis = 409, odepsaný se obnoví (stejný řádek, původní `created_at`).
- DB hlídá unikátnost jen mezi aktivními zápisy (`uq_enrollment_user_course_active`).
- Leave i remove nastaví `left_at`. Opakované odepsání = 400. Leave soft-smazaného zápisu = 404.
- Soft delete už deaktivovaného zápisu = 400.
- `completed_at` se nastaví jen jednou a nemaže se. Je to historický fakt: když lektor později přidá povinný test nebo modul, kurz má `completed_at` a zároveň `next_module`.
- Kurz bez povinných testů je hotový hned. `completed_at` mu doplní `my_enrollments` (čas zobrazení).
- `mark_module_visited` je tichý no-op, když modul neexistuje nebo uživatel nemá aktivní zápis. Slouží k trackingu, ne k autorizaci.
- `my_enrollments` vrací jen aktivní zápisy v aktivních kurzech. Řadí podle `last_activity_at`, fallback `created_at` zápisu.
- `last_activity_at` bez visitu spadne na poslední `updated_at` assessment session v kurzu.
- Aktivita (heat mapa) sčítá za den: `passed` sessions, zápisy a dokončené kurzy. Soft-smazané zápisy se nepočítají, odepsané ano. Max 400 dní, default 180. U každého dne max 3 popisky.
- Aktivita: `from_date` a `to_date` se zadávají spolu, jen jeden = 422. Prohozený rozsah se otočí, delší než 400 dní se ořízne od `to_date`.
- `my_enrollments` volá `course_completion` pro každý kurz (N+1, označeno `ponytail:`).

## Soubory

| Soubor | Obsah |
| --- | --- |
| `controllers.py` | Zápis, odepsání, soft delete, `my_enrollments`, visit, aktivita. |
| `schemas.py` | `Enrollment`, `MyEnrollment`, `ActivityResponse` a pomocná schémata. |
| `routers.py` | Endpointy pod `/enrollments`. |
| `../../models.py` | `Enrollment`. |
| `../common/utils.py` | `check_enrollment`, `get_or_404`. |
| `../assessments/utils.py` | `course_completion`, `assert_prerequisites_passed`. |
| `../assessments/controllers.py` | `PREREQUISITES`, `mark_course_completed`. |
