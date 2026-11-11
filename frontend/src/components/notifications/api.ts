//  Notifikace — datová vrstva schránky a nastavení.
//
//  Backend zatím notifikace nemá. Funkce níže mají podpis, jaký budou mít
//  skutečné endpointy, ale data drží v localStorage prohlížeče (per profil).
//  Až backend přibude, stačí přepsat těla funkcí na `fetch` (stejný vzor jako
//  `components/tickets/api.ts`) — komponenty ani hook se nemění.
//
//  Navrhované endpointy:
//    GET    /api/v1/notifications?audience=user|admin         → AppNotification[]
//    POST   /api/v1/notifications/read   { ids, read }
//    DELETE /api/v1/notifications/{id}
//    GET    /api/v1/notifications/preferences?audience=…      → NotificationPreferences
//    PUT    /api/v1/notifications/preferences?audience=…      { channels, emailDigest }
//
//  Mimo produkci se schránka při prvním načtení naplní ukázkovými
//  notifikacemi, aby šlo UI vyzkoušet. V produkci je prázdná.

import { ROUTES } from "@/lib/constants";
import { sleep } from "@/lib/utils";
import type {
  AppNotification,
  NotificationAudience,
  NotificationPreferences,
} from "./types";

const STORAGE_PREFIX = "praktik-ai-notifications";
const SEED_DEMO_DATA = process.env.NODE_ENV !== "production";
// Malé zpoždění, ať je i s mockem vidět stav načítání jako se skutečným API.
const MOCK_LATENCY_MS = 250;

type StoredNotification = Omit<AppNotification, "createdAt"> & { createdAt: string };

interface StoredState {
  items: StoredNotification[];
  preferences: Partial<NotificationPreferences> | null;
}

// ── localStorage ────────────────────────────────────────────────────────────

function storageKey(audience: NotificationAudience): string {
  return `${STORAGE_PREFIX}:${audience}`;
}

function readState(audience: NotificationAudience): StoredState {
  try {
    const raw = localStorage.getItem(storageKey(audience));
    if (raw) return JSON.parse(raw) as StoredState;
  } catch {
    // poškozený záznam nebo localStorage bez přístupu → začneme znovu
  }
  const fresh: StoredState = {
    items: SEED_DEMO_DATA ? demoNotifications(audience) : [],
    preferences: null,
  };
  writeState(audience, fresh);
  return fresh;
}

function writeState(audience: NotificationAudience, state: StoredState): void {
  try {
    localStorage.setItem(storageKey(audience), JSON.stringify(state));
  } catch {
    // privátní okno / plné úložiště — změna vydrží jen do obnovení stránky
  }
}

function toNotification(item: StoredNotification): AppNotification {
  return { ...item, createdAt: new Date(item.createdAt) };
}

// ── Veřejné API ─────────────────────────────────────────────────────────────

/** Notifikace profilu seřazené od nejnovější. */
export async function listNotifications(
  audience: NotificationAudience,
): Promise<AppNotification[]> {
  await sleep(MOCK_LATENCY_MS);
  return readState(audience)
    .items.map(toNotification)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Označí vyjmenované notifikace jako (ne)přečtené. */
export async function setNotificationsRead(
  audience: NotificationAudience,
  ids: string[],
  read = true,
): Promise<void> {
  if (ids.length === 0) return;
  const state = readState(audience);
  const target = new Set(ids);
  state.items = state.items.map((item) =>
    target.has(item.id) ? { ...item, read } : item,
  );
  writeState(audience, state);
}

export async function deleteNotification(
  audience: NotificationAudience,
  id: string,
): Promise<void> {
  const state = readState(audience);
  state.items = state.items.filter((item) => item.id !== id);
  writeState(audience, state);
}

/**
 * Uložené nastavení, nebo `null`, pokud ho uživatel ještě neměnil. Může být
 * neúplné — doplní se přes `resolveNotificationPreferences`.
 */
export async function getNotificationPreferences(
  audience: NotificationAudience,
): Promise<Partial<NotificationPreferences> | null> {
  return readState(audience).preferences;
}

export async function saveNotificationPreferences(
  audience: NotificationAudience,
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  await sleep(MOCK_LATENCY_MS);
  const state = readState(audience);
  state.preferences = preferences;
  writeState(audience, state);
  return preferences;
}

// ── Ukázková data (jen mimo produkci) ───────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function demoNotifications(audience: NotificationAudience): StoredNotification[] {
  const now = Date.now();
  const at = (ago: number) => new Date(now - ago).toISOString();

  if (audience === "admin") {
    return [
      {
        id: "demo-admin-1",
        category: "ticket_new",
        title: "Nový tiket v kurzu Prompt engineering",
        body: "Student se ptá k modulu 3: „Cvičení s řetězením promptů mi po odeslání skončí chybou. Dělám něco špatně?“",
        createdAt: at(18 * MINUTE),
        read: false,
        actorName: "Petr Svoboda",
      },
      {
        id: "demo-admin-2",
        category: "review_request",
        title: "Kurz „Etika AI ve škole“ čeká na schválení",
        body: "Lektorka odeslala kurz ke schválení. Obsahuje 5 modulů a závěrečný test.",
        createdAt: at(2 * HOUR),
        read: false,
        href: "/admin/review",
        actorName: "Mgr. Jana Nováková",
      },
      {
        id: "demo-admin-3",
        category: "generation",
        title: "Generování obsahu dokončeno",
        body: "Obsah kurzu „Datová gramotnost“ je připravený ke kontrole a úpravám.",
        createdAt: at(5 * HOUR),
        read: false,
      },
      {
        id: "demo-admin-4",
        category: "enrollment",
        title: "3 noví studenti v kurzu Prompt engineering",
        createdAt: at(1 * DAY + 3 * HOUR),
        read: true,
      },
      {
        id: "demo-admin-5",
        category: "feedback",
        title: "Nové hodnocení kurzu: 5 z 5",
        body: "„Skvěle vysvětlené, konečně rozumím few-shot promptům.“",
        createdAt: at(2 * DAY),
        read: true,
      },
      {
        id: "demo-admin-6",
        category: "review_result",
        title: "Kurz „Úvod do AI“ byl schválen",
        body: "Garant kurz schválil a je teď dostupný studentům v katalogu.",
        createdAt: at(4 * DAY),
        read: true,
      },
      {
        id: "demo-admin-7",
        category: "system",
        title: "Plánovaná údržba platformy",
        body: "Tuto sobotu od 22:00 do 23:00 může být platforma krátce nedostupná. Rozpracované změny si prosím uložte.",
        createdAt: at(6 * DAY),
        read: true,
      },
    ];
  }

  return [
    {
      id: "demo-user-1",
      category: "ticket_reply",
      title: "Lektor odpověděl na váš dotaz",
      body: "K tiketu „Cvičení v modulu 3 končí chybou“: Zkuste prosím zkrátit vstupní text pod 2 000 znaků — limit jsme právě zvýšili, po obnovení stránky by to mělo projít.",
      createdAt: at(25 * MINUTE),
      read: false,
      href: ROUTES.MY_TICKETS,
      actorName: "Mgr. Jana Nováková",
    },
    {
      id: "demo-user-2",
      category: "course_update",
      title: "Nový modul v kurzu Prompt engineering",
      body: "Přibyl modul „Řetězení promptů“. Pokračujte tam, kde jste skončili.",
      createdAt: at(3 * HOUR),
      read: false,
      href: "/moje-kurzy",
    },
    {
      id: "demo-user-3",
      category: "badge",
      title: "Získali jste odznak První modul",
      body: "Gratulujeme k dokončení prvního modulu! Odznak najdete ve svém profilu.",
      createdAt: at(1 * DAY + 2 * HOUR),
      read: true,
      href: "/odmeny",
    },
    {
      id: "demo-user-4",
      category: "study_reminder",
      title: "Máte rozpracovaný modul",
      body: "Modul „Úvod do AI“ čeká na dokončení. Zbývá vám zhruba 10 minut.",
      createdAt: at(3 * DAY),
      read: true,
      href: "/moje-kurzy",
    },
    {
      id: "demo-user-5",
      category: "system",
      title: "Plánovaná údržba platformy",
      body: "Tuto sobotu od 22:00 do 23:00 může být platforma krátce nedostupná.",
      createdAt: at(6 * DAY),
      read: true,
    },
  ];
}
