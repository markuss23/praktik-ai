# Tickety (`tickets`)

Obecný systém reklamací a dotazů. Ticket se váže na modul, kurz, veřejný materiál, nebo na nic (`general`), a obsah žije ve vlákně zpráv.

## Pojmy

| Pojem | Význam |
| --- | --- |
| `requester` | Kdo ticket založil (`requester_id`). |
| `assignee` | Staff, který si ticket přiřadil přes claim (`assignee_id`). Jinak `null`. |
| `entity_type` / `entity_id` | Na co se ticket váže: `module`, `course`, `pub_resource`, `general`. U `general` je `entity_id` vždy `null`, u ostatních povinné. |
| `course_id` | Denormalizovaný kurz. Doplní ho resolver. U `pub_resource` a `general` je `null`. |
| `category` | Kategorie ticketu (`TicketType`). Povolené hodnoty závisí na `entity_type`. |
| resolver | Třída v `resolvers.py` s pravidly jednoho `entity_type`: načtení entity, kdo smí založit, kdo je staff, `course_id`. |
| staff | Kdo smí ticket řešit. Rozhoduje `resolver.is_staff_for`. |
| interní poznámka | Zpráva s `is_internal = True`. Vidí ji jen staff. |

Kategorie podle `entity_type` (k nim vždy navíc `bug`, `question`, `other`):

| `entity_type` | Vlastní kategorie | Staff |
| --- | --- | --- |
| `module` | `task_session`, `practice` | vlastník kurzu (lektor), garant, superadmin |
| `course` | `course_feedback` | vlastník kurzu (lektor), garant, superadmin |
| `pub_resource` | `content_issue` | garant, superadmin |
| `general` | – | garant, superadmin |

## Tok

```mermaid
stateDiagram-v2
    [*] --> open: create_ticket
    open --> in_progress: claim (staff)
    open --> resolved: staff
    in_progress --> resolved: staff
    resolved --> in_progress: zpráva requestera
    resolved --> closed: requester nebo staff
    open --> closed: requester (stažení)
    in_progress --> closed: requester (stažení)
    open --> [*]: smazání (requester / garant / superadmin)
    in_progress --> [*]: smazání (garant / superadmin)
    resolved --> [*]: smazání (garant / superadmin)
    closed --> [*]: smazání (garant / superadmin)
```

`pending` je v enumu jen kvůli DB. Kód ho nikde nenastavuje.

## Oprávnění

„vlastní“ = actor je requester. „staff“ = viz tabulka kategorií.

| Akce | user | lector | guarantor | superadmin |
| --- | --- | --- | --- | --- |
| Číst kategorie (`/tickets/categories`) | ano, i bez přihlášení | ano | ano | ano |
| Založit k `module` | jen zapsaný v kurzu | jen zapsaný v kurzu | jen zapsaný v kurzu | jen zapsaný v kurzu |
| Založit ke `course` | jen zapsaný | zapsaný nebo vlastník kurzu | jen zapsaný | vždy |
| Založit k `pub_resource` / `general` | ano | ano | ano | ano |
| Seznam ticketů | vlastní | vlastní + tickety vlastních kurzů | všechny | všechny |
| Detail a zprávy | vlastní | vlastní + kde je staff | všechny | všechny |
| Vidět interní poznámky | ne | kde je staff | ano | ano |
| Přidat zprávu | vlastní | vlastní + kde je staff | ano | ano |
| Přidat interní poznámku | ne | kde je staff | ano | ano |
| Claim (`open` → `in_progress`) | ne | kde je staff | ano | ano |
| Nastavit `resolved` | ne | kde je staff | ano | ano |
| Nastavit `closed` | vlastní v jakémkoli stavu | vlastní v jakémkoli stavu + kde je staff jen z `resolved` | jen z `resolved` (vlastní v jakémkoli) | jen z `resolved` (vlastní v jakémkoli) |
| Smazat | vlastní, jen ve stavu `open` | vlastní, jen ve stavu `open` | vždy | vždy |

Všechny endpointy kromě kategorií mají `require_role("user")`. Skutečná práva řeší controller a resolver.

## Pravidla

- Requester smí mít k jedné entitě a kategorii jen jeden aktivní nevyřešený ticket (`open`, `in_progress`, `pending`). Jinak 409. Hlídá to controller i částečný unikátní index `uq_ticket_requester_entity_category`.
- Pro `general` se duplicita nehlídá (`entity_id` je `null`).
- Kategorie se validuje v `TicketCreate` proti `get_allowed_categories(entity_type)`. Špatná kombinace = 422.
- Založení ticketu vytvoří i první zprávu (`message`) od requestera.
- Claim jde jen ze stavu `open`. Nastaví `assignee_id` a `in_progress`.
- Ručně (`PUT`) jdou nastavit jen `resolved` a `closed`. Ostatní stavy = 400.
- Requester smí zavřít (stáhnout) vlastní ticket v jakémkoli neuzavřeném stavu (`open`, `in_progress`, `pending`, `resolved`). Historie zpráv zůstane.
- Staff smí zavřít cizí ticket jen z `resolved`, jinak 400.
- `resolved` jde jen z `open`, `in_progress` nebo `pending`. Z `resolved` vrací 400.
- Vyřešení bez claimu ticket automaticky přiřadí tomu staffu, který ho vyřešil (`assignee_id = actor`). Už přiřazený ticket si `assignee` ponechá.
- `closed` je konečný stav. Změna stavu i nová zpráva na něm vrací 409. Kdo chce pokračovat, založí nový ticket.
- Veřejná zpráva requestera na `resolved` ticket ho vrátí do `in_progress`. Předtím se znovu ověří duplicita. Odpověď ani interní poznámka staffu stav nemění.
- Na `closed` ticket nejde přidat zprávu (409).
- Requester nevidí interní poznámky. Staff vidí vše.
- Mazání je soft delete (`is_active = False`). Kaskádově smaže i zprávy.

## Soubory

| Soubor | Obsah |
| --- | --- |
| `controllers.py` | Veškerá logika: výpis, detail, založení, zprávy, claim, změna stavu, mazání, kontrola duplicit. |
| `resolvers.py` | Resolver pro každý `entity_type`, registr `RESOLVERS`, `UNIVERSAL_CATEGORIES`, `is_course_staff`. |
| `schemas.py` | Pydantic schémata. `TicketCreate` validuje `entity_id` a kategorii. |
| `routers.py` | `router` (přihlášení) a `public_router` (jen `/categories`). |
| `../../models.py` | `Ticket`, `TicketMessage`. |
| `../../enums.py` | `TicketStatus`, `TicketType`, `TicketEntityType`. |

Nový `entity_type` = nová hodnota v `TicketEntityType`, nový resolver a záznam v `RESOLVERS`.

## Pozor na

- Po claimu může ticket dál řešit kterýkoli staff, nejen `assignee`.
- V datech se nerozliší ticket „vyřešený a potvrzený“ od ticketu „staženého requesterem“ — oba končí jako `closed`.
- Lektor nesmí smazat cizí ticket ani u vlastního kurzu (aby nemohl schovat stížnosti na kurz). Může ho jen vyřešit. Mazat smí garant a superadmin, a to i ticket ke smazané entitě (mazání nevolá `load_entity`).
- Garant nemá u `course` ticketu bypass zápisu — **záměrně**. `course_feedback` je zpětná vazba od studentů; garant kurz sám dohlíží a ticket by vyřizoval sám sobě. Problém s kurzem může nahlásit jako `general` ticket.
- Práva staffu k existujícímu ticketu se počítají přes entitu, která se načítá i soft-smazaná (`load_entity(..., include_inactive=True)`). Ticket ke smazanému kurzu, modulu nebo materiálu tak dál vidí requester i staff (lektor kurzu). Pokud entita v DB fyzicky není, staff je jen garant a superadmin. Zakládat nový ticket jde jen k aktivní entitě.
- Lektor v seznamu nevidí cizí tickety `pub_resource` a `general` — **záměrně**, není pro ně staff. Platí to i pro nahlášení chyby ve veřejném materiálu, jehož je autorem. Takové tickety řeší garant nebo superadmin a autorovi je případně předají sami.
