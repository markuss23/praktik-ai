"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { useRole } from "@/hooks/useRole";
import { getNotificationCategories } from "./categories";
import { NotificationInbox } from "./NotificationInbox";
import { NotificationSettingsModal } from "./NotificationSettingsModal";
import type { NotificationAudience, NotificationChannel } from "./types";
import { useNotifications } from "./useNotifications";

export interface NotificationCenterProps {
  /** `user` pro /profil, `admin` pro profil v administraci. */
  audience: NotificationAudience;
  title?: string;
  /** Výška seznamu v px, nad kterou se roluje uvnitř karty. */
  maxListHeight?: number;
  /** Které kanály nabídnout v nastavení; výchozí schránka i e-mail. */
  channels?: NotificationChannel[];
  className?: string;
}

/**
 * Napojená schránka + modal nastavení pro jeden profil:
 *
 * ```tsx
 * <NotificationCenter audience="user" />   // /profil
 * <NotificationCenter audience="admin" />  // profil v adminu
 * ```
 *
 * Kategorie se vyberou podle `audience` a odfiltrují podle role (garant vidí
 * navíc schvalování kurzů). Pro vlastní rozložení jdou `NotificationInbox`,
 * `NotificationSettingsModal` a `useNotifications` použít i samostatně.
 */
export function NotificationCenter({
  audience,
  title,
  maxListHeight,
  channels,
  className,
}: NotificationCenterProps) {
  const { role } = useRole();
  const toast = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const allCategories = useMemo(() => getNotificationCategories(audience), [audience]);
  const categories = useMemo(
    () => getNotificationCategories(audience, role),
    [audience, role],
  );

  const inbox = useNotifications(audience, categories, allCategories);

  return (
    <>
      <NotificationInbox
        notifications={inbox.notifications}
        categories={categories}
        loading={inbox.loading}
        error={inbox.error}
        title={title}
        maxListHeight={maxListHeight}
        onMarkRead={inbox.markRead}
        onMarkUnread={inbox.markUnread}
        onDelete={inbox.remove}
        onOpenSettings={() => setSettingsOpen(true)}
        onRetry={inbox.refetch}
        className={className}
      />

      <NotificationSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={categories}
        preferences={inbox.preferences}
        channels={channels}
        onSave={async (next) => {
          await inbox.savePreferences(next);
          toast.success("Nastavení notifikací bylo uloženo.");
        }}
      />
    </>
  );
}
