"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteNotification,
  getNotificationPreferences,
  listNotifications,
  saveNotificationPreferences,
  setNotificationsRead,
} from "./api";
import { resolveNotificationPreferences } from "./categories";
import type {
  AppNotification,
  NotificationAudience,
  NotificationCategory,
  NotificationPreferences,
} from "./types";

/**
 * Stav schránky a nastavení pro jeden profil. Změny přečtení a mazání se
 * promítnou hned (optimisticky); když server odmítne, data se načtou znovu.
 *
 * `categories` musí být stabilní reference (useMemo) — podle nich se doplní
 * výchozí nastavení a schovají notifikace kategorií, na které role nemá.
 */
export function useNotifications(
  audience: NotificationAudience,
  categories: NotificationCategory[],
  /** Celá sada kategorií profilu bez filtru role — pro schování nedostupných. */
  allCategories: NotificationCategory[] = categories,
) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [storedPreferences, setStoredPreferences] =
    useState<Partial<NotificationPreferences> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const [list, prefs] = await Promise.all([
          listNotifications(audience),
          getNotificationPreferences(audience),
        ]);
        setItems(list);
        setStoredPreferences(prefs);
      } catch {
        setError("Notifikace se nepodařilo načíst.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [audience],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Notifikace kategorií, které jsou v profilu, ale role na ně nemá (např.
  // schvalování pro lektora), schováme. Neznámé kategorie necháváme — backend
  // může posílat i typy, o kterých frontend ještě neví.
  const notifications = useMemo(() => {
    const visible = new Set(categories.map((c) => c.id));
    const hidden = new Set(
      allCategories.filter((c) => !visible.has(c.id)).map((c) => c.id),
    );
    return hidden.size === 0 ? items : items.filter((n) => !hidden.has(n.category));
  }, [items, categories, allCategories]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const preferences = useMemo(
    () => resolveNotificationPreferences(categories, storedPreferences),
    [categories, storedPreferences],
  );

  const setRead = useCallback(
    async (ids: string[], read = true) => {
      if (ids.length === 0) return;
      const target = new Set(ids);
      setItems((prev) => prev.map((n) => (target.has(n.id) ? { ...n, read } : n)));
      try {
        await setNotificationsRead(audience, ids, read);
      } catch {
        void load(false);
      }
    },
    [audience, load],
  );

  const markRead = useCallback((id: string) => setRead([id], true), [setRead]);
  const markUnread = useCallback((id: string) => setRead([id], false), [setRead]);
  const markAllRead = useCallback(
    () => setRead(notifications.filter((n) => !n.read).map((n) => n.id), true),
    [notifications, setRead],
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((n) => n.id !== id));
      try {
        await deleteNotification(audience, id);
      } catch {
        void load(false);
      }
    },
    [audience, load],
  );

  /** Uloží nastavení; chybu propustí dál, ať ji modal může ukázat. */
  const savePreferences = useCallback(
    async (next: NotificationPreferences) => {
      const saved = await saveNotificationPreferences(audience, next);
      setStoredPreferences(saved);
    },
    [audience],
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    markRead,
    markUnread,
    markAllRead,
    remove,
    savePreferences,
    refetch: () => load(false),
  };
}
