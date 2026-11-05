# Zadání — Ticket systém

Zobecnění stávajících `module_ticket` (reklamace AI hodnocení modulu) na obecný ticket systém
konverzace místo jedné odpovědi, stavový workflow.
Ticket může být ke kurzu (volitelně k modulu), nebo k platformě obecně (bez kurzu).

---

## Role

| Role | Co může |
|---|---|
| **Autor** (přihlášený uživatel) | Založí ticket k platformě, nebo v kurzu, kde je zapsán; vidí jen své tickety; píše zprávy; smaže ticket, dokud na něj nikdo neodpověděl |
| **Řešitel kurzu** = vlastník kurzu, garant, superadmin | Vidí všechny tickety kurzu, odpovídá, píše interní poznámky, mění stav a řešitele |
| **Superadmin** | + řeší tickety k platformě (bez kurzu), smaže jakýkoli ticket |

Lektor, který kurz nevlastní, k ticketům kurzu přístup **nemá** (`403`).
Na vlastní ticket nemůže nikdo odpovídat jako řešitel.

---

## Datový model

### `ticket`

| Sloupec | Typ | Poznámka |
|---|---|---|
| `ticket_id` | bigint PK | |
| `author_id` | FK `user` | zakladatel |
| `course_id` | FK `course`, nullable | rozsah oprávnění; `NULL` = ticket k platformě |
| `module_id` | FK `module`, nullable | volitelné upřesnění, jen s `course_id` |
| `category` | enum `ticket_category` | `ai_evaluation`, `content_error`, `technical`, `other` |
| `title` | varchar(255) | **bez** unikátnosti |
| `status` | enum `ticket_status` | viz níže |
| `assignee_id` | FK `user`, nullable | kdo ticket řeší |
| `resolved_at` | timestamptz, nullable | |
| + `TimestampMixin`, `SoftDeleteMixin` | | |

### `ticket_message`

| Sloupec | Typ | Poznámka |
|---|---|---|
| `message_id` | bigint PK | |
| `ticket_id` | FK `ticket` | |
| `author_id` | FK `user` | autor zprávy (ne ticketu) |
| `body` | text, NOT NULL | prázdný / jen mezery → `422` |
| `is_internal` | bool, default false | interní poznámka řešitelů |
| + `TimestampMixin` | | |

První zpráva vzniká spolu s ticketem (důvod reklamace).

---

## Stavy

```diagram
open ──(řešitel odpoví)──▶ pending ──(student odpoví)──▶ open
  │                           │
  └──────(řešitel)──▶ resolved ◀──(řešitel)──┘
                         │
          (student odpoví) ──▶ open
                         │
             (14 dní bez reakce) ──▶ closed
```

| Stav | Význam |
|---|---|
| `open` | Čeká na řešitele |
| `pending` | Čeká na studenta |
| `resolved` | Vyřešeno, student může znovu otevřít odpovědí |
| `closed` | Konečný stav, jen čtení; nastavuje jen systém |

- Veřejná zpráva řešitele na `open` → `pending`. Interní poznámka stav nemění.
- Zpráva studenta na `pending` / `resolved` → `open`.
- Do `closed` ticketu nelze psát (`409`). `closed` nejde nastavit přes API.
- Přechod do `resolved` vyplní `resolved_at`.

---

## API

Prefix `/api/v1`, vše vyžaduje přihlášení.

| Metoda | Cesta | Kdo | Popis | Odpověď |
|---|---|---|---|---|
| `GET` | `/tickets?course_id=&status=&mine=&limit=&offset=` | student, řešitel | Seznam. Student dostane jen své. Bez `course_id` vrací všechny tickety, kde je volající autor nebo řešitel (superadmin i platformní) | `200` |
| `POST` | `/tickets` | přihlášený uživatel; s `course_id` jen zapsaný v kurzu | Založí ticket + první zprávu (`body`). Bez `course_id` = ticket k platformě | `201` |
| `GET` | `/tickets/{id}` | autor, řešitel | Detail se zprávami. Autorovi se nevrací `is_internal` zprávy | `200` |
| `POST` | `/tickets/{id}/messages` | autor, řešitel | Přidá zprávu, řídí přechod stavu. `is_internal` smí jen řešitel | `201` |
| `PATCH` | `/tickets/{id}` | řešitel | Změna `status` (kromě `closed`) a `assignee_id` | `200` |
| `DELETE` | `/tickets/{id}` | autor (bez odpovědi řešitele), superadmin | Soft delete | `204` |

Chyby: `403` bez oprávnění, `404` neexistuje / smazaný, `409` druhý nevyřešený ticket k modulu
nebo zápis do `closed`, `422` nevalidní vazby či prázdný text. `limit` max 100.

---

## Mimo rozsah

Přílohy, SLA, notifikace e-mailem, historie změn stavu.
Přidat, až budou potřeba.

---

## Akceptační kritéria

- [ ] Lektor bez vlastnictví kurzu dostane `403` na seznam i detail ticketů kurzu.
- [ ] Po smazání otevřeného ticketu jde k modulu založit nový.
- [ ] Dva studenti mohou založit tickety se stejným titulkem.
- [ ] Student nevidí interní poznámky.
- [ ] Odpověď studenta na `resolved` ticket ho vrátí do `open`.
- [ ] Do `closed` ticketu nejde psát.
- [ ] Modul jiného kurzu nebo modul bez kurzu → `422`.
- [ ] Ticket bez kurzu jde založit; vidí ho jen autor a superadmin.
- [ ] Migrace převede existující tickety beze ztráty textu.
- [ ] Testy v `backend/tests/test_tickets.py` pokrývají body výše.

---

## Otevřená otázka

Co se starým `/module-tickets`, který volá frontend: smazat rovnou, nebo nechat jako
deprecated vrstvu nad novými tabulkami, dokud se frontend nepřepíše?
