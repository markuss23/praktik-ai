// Sady kategorií notifikací pro jednotlivé profily.
//
// Nová kategorie = nová položka tady; schránka i modal nastavení si ji
// převezmou samy. `id` musí odpovídat tomu, co bude posílat backend.

import {
  Award,
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  Clock,
  Library,
  Megaphone,
  MessageSquareReply,
  Sparkles,
  Star,
  Ticket,
  UserPlus,
} from "lucide-react";
import { hasMinRole, type AppRole } from "@/lib/keycloak";
import type {
  EmailDigest,
  NotificationAudience,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
} from "./types";

// Systémová oznámení jsou v obou profilech stejná a ve schránce nejdou vypnout —
// údržba nebo změna podmínek se k uživateli dostat musí.
const SYSTEM_CATEGORY: NotificationCategory = {
  id: "system",
  label: "Systémová oznámení",
  description: "Plánovaná údržba, nové funkce a důležité změny platformy.",
  icon: Megaphone,
  tone: "gradient-r",
  defaults: { inApp: true, email: true },
  locked: ["inApp"],
};

/** Profil studenta (/profil). */
export const USER_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: "ticket_reply",
    label: "Odpovědi na tikety",
    description: "Lektor odpověděl na váš dotaz k modulu.",
    icon: MessageSquareReply,
    tone: "tip",
    defaults: { inApp: true, email: true },
  },
  {
    id: "course_update",
    label: "Novinky v kurzech",
    description: "Nové moduly a změny v kurzech, do kterých jste zapsaní.",
    icon: BookOpen,
    tone: "primary",
    defaults: { inApp: true, email: false },
  },
  {
    id: "study_reminder",
    label: "Připomínky studia",
    description: "Upozornění na rozpracované moduly, ke kterým jste se dlouho nevrátili.",
    icon: Clock,
    tone: "warning",
    defaults: { inApp: true, email: false },
  },
  {
    id: "badge",
    label: "Odznaky a odměny",
    description: "Nově získané odznaky a postup na další úroveň.",
    icon: Award,
    tone: "brand-accent",
    defaults: { inApp: true, email: false },
  },
  {
    id: "material_activity",
    label: "Veřejná databáze",
    description: "Hodnocení a převzetí vašich materiálů ostatními.",
    icon: Library,
    tone: "tip",
    defaults: { inApp: true, email: false },
  },
  SYSTEM_CATEGORY,
];

/** Profil v adminu (lektor a výš). */
export const ADMIN_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: "ticket_new",
    label: "Nové tikety",
    description: "Student položil dotaz k modulu ve vašem kurzu.",
    icon: Ticket,
    tone: "destructive",
    defaults: { inApp: true, email: true },
  },
  {
    id: "review_request",
    label: "Kurzy ke schválení",
    description: "Kurz čeká na vaše posouzení jako garanta.",
    icon: ClipboardCheck,
    tone: "warning",
    defaults: { inApp: true, email: true },
    minRole: "guarantor",
  },
  {
    id: "review_result",
    label: "Výsledek schválení",
    description: "Váš kurz byl schválen, nebo vrácen k přepracování.",
    icon: BadgeCheck,
    tone: "primary",
    defaults: { inApp: true, email: true },
  },
  {
    id: "generation",
    label: "AI generování",
    description: "Dokončené nebo neúspěšné generování obsahu kurzu.",
    icon: Sparkles,
    tone: "gradient-r",
    defaults: { inApp: true, email: false },
  },
  {
    id: "enrollment",
    label: "Noví studenti",
    description: "Zápisy studentů do vašich kurzů.",
    icon: UserPlus,
    tone: "tip",
    defaults: { inApp: true, email: false },
  },
  {
    id: "feedback",
    label: "Zpětná vazba",
    description: "Hodnocení a komentáře studentů k vašim kurzům.",
    icon: Star,
    tone: "brand-accent",
    defaults: { inApp: true, email: false },
  },
  SYSTEM_CATEGORY,
];

const CATEGORIES_BY_AUDIENCE: Record<NotificationAudience, NotificationCategory[]> = {
  user: USER_NOTIFICATION_CATEGORIES,
  admin: ADMIN_NOTIFICATION_CATEGORIES,
};

/**
 * Kategorie pro daný profil, odfiltrované podle role přihlášeného uživatele.
 * Bez `role` vrátí celou sadu profilu.
 */
export function getNotificationCategories(
  audience: NotificationAudience,
  role?: AppRole,
): NotificationCategory[] {
  const all = CATEGORIES_BY_AUDIENCE[audience];
  if (!role) return all;
  return all.filter((c) => !c.minRole || hasMinRole(role, c.minRole));
}

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  inApp: "Schránka",
  email: "E-mail",
};

export const EMAIL_DIGEST_LABELS: Record<EmailDigest, string> = {
  instant: "Hned",
  daily: "Denně",
  weekly: "Týdně",
};

export const DEFAULT_EMAIL_DIGEST: EmailDigest = "instant";

/** Výchozí nastavení složené z `defaults` jednotlivých kategorií. */
export function defaultNotificationPreferences(
  categories: NotificationCategory[],
): NotificationPreferences {
  return {
    channels: Object.fromEntries(categories.map((c) => [c.id, { ...c.defaults }])),
    emailDigest: DEFAULT_EMAIL_DIGEST,
  };
}

/**
 * Doplní uložené nastavení o kategorie, které v něm chybí (přibyly později),
 * a vynutí zamčené kanály. Výsledek má vždy záznam pro každou kategorii.
 */
export function resolveNotificationPreferences(
  categories: NotificationCategory[],
  stored?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  const channels: NotificationPreferences["channels"] = {};
  for (const c of categories) {
    const saved = stored?.channels?.[c.id];
    const merged = { ...c.defaults, ...saved };
    for (const locked of c.locked ?? []) merged[locked] = true;
    channels[c.id] = merged;
  }
  return {
    channels,
    emailDigest: stored?.emailDigest ?? DEFAULT_EMAIL_DIGEST,
  };
}
