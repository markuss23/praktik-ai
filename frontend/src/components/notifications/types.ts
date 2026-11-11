// Doménové typy pro schránku notifikací a jejich nastavení.
//
// Modul je sdílený mezi profilem studenta (/profil) a profilem v adminu —
// liší se jen `audience`, podle které se vybere sada kategorií a data.

import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/keycloak";

/** Kterému profilu notifikace patří — určuje kategorie i zdroj dat. */
export type NotificationAudience = "user" | "admin";

/** Kam se notifikace doručí: do schránky v aplikaci, nebo i e-mailem. */
export type NotificationChannel = "inApp" | "email";

/** Jak často chodí e-maily — hned, nebo jako souhrn. */
export type EmailDigest = "instant" | "daily" | "weekly";

/** Barevný tón ikony kategorie — jen sémantické tokeny z globals.css. */
export type NotificationTone =
  | "primary"
  | "tip"
  | "warning"
  | "brand-accent"
  | "gradient-r"
  | "destructive";

export interface NotificationCategory {
  id: string;
  /** Krátký název do schránky i nastavení („Odpovědi na tikety"). */
  label: string;
  /** Jedna věta do nastavení — co přesně v kategorii chodí. */
  description: string;
  icon: LucideIcon;
  tone: NotificationTone;
  /** Výchozí stav kanálů pro nového uživatele. */
  defaults: Record<NotificationChannel, boolean>;
  /**
   * Kanály, které uživatel nemůže vypnout (např. systémová oznámení ve
   * schránce). Přepínač je v nastavení vidět, ale je zamčený.
   */
  locked?: NotificationChannel[];
  /** Kategorie se ukáže jen od této role výš (např. schvalování → garant). */
  minRole?: AppRole;
}

/** Jedna položka ve schránce. Pojmenované `AppNotification`, aby se nebilo s DOM `Notification`. */
export interface AppNotification {
  id: string;
  /** `NotificationCategory.id` — neznámá kategorie se vykreslí jako obecná. */
  category: string;
  title: string;
  /** Delší text; ve schránce zkrácený, po rozkliknutí celý. */
  body?: string;
  createdAt: Date;
  read: boolean;
  /** Odkaz na související obsah (tiket, kurz…), zobrazí se jako „Otevřít". */
  href?: string;
  /** Kdo akci vyvolal („Mgr. Novák"), pokud to dává smysl. */
  actorName?: string;
}

export interface NotificationPreferences {
  /** `categoryId → kanál → zapnuto`. Chybějící kategorie berou `defaults`. */
  channels: Record<string, Record<NotificationChannel, boolean>>;
  emailDigest: EmailDigest;
}
