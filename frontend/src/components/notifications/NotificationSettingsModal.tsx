"use client";

import { useEffect, useId, useState } from "react";
import { Inbox, Loader2, Lock, Mail, RotateCcw } from "lucide-react";
import {
  Button,
  Modal,
  SegmentedControl,
  SegmentedControlItem,
  Switch,
} from "@/components/ui";
import {
  defaultNotificationPreferences,
  EMAIL_DIGEST_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  resolveNotificationPreferences,
} from "./categories";
import { NotificationCategoryIcon } from "./NotificationCategoryIcon";
import type {
  EmailDigest,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
} from "./types";

const CHANNEL_ICONS: Record<NotificationChannel, typeof Inbox> = {
  inApp: Inbox,
  email: Mail,
};

const DIGEST_OPTIONS: EmailDigest[] = ["instant", "daily", "weekly"];

export interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NotificationCategory[];
  /** Aktuální nastavení (už doplněné o výchozí hodnoty). */
  preferences: NotificationPreferences;
  /** Uloží nastavení. Když vyhodí chybu, modal zůstane otevřený a ukáže ji. */
  onSave: (preferences: NotificationPreferences) => Promise<void> | void;
  /** Které kanály nabídnout; výchozí schránka i e-mail. */
  channels?: NotificationChannel[];
  title?: string;
  description?: string;
}

/**
 * Nastavení, co a kam má profil dostávat. Matice kategorie × kanál
 * s přepínači + frekvence e-mailů. Sdílené mezi profilem studenta a adminem —
 * sada kategorií přichází zvenku.
 */
export function NotificationSettingsModal({
  isOpen,
  onClose,
  categories,
  preferences,
  onSave,
  channels = ["inApp", "email"],
  title = "Nastavení notifikací",
  description = "Vyberte, o čem vám máme dát vědět a kam. Změny platí pro nové notifikace.",
}: NotificationSettingsModalProps) {
  const digestLabelId = useId();
  const [draft, setDraft] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Při každém otevření začínáme od uloženého stavu — neuložené změny se zahodí.
  useEffect(() => {
    if (isOpen) {
      setDraft(preferences);
      setError(null);
    }
  }, [isOpen, preferences]);

  const setChannel = (categoryId: string, channel: NotificationChannel, on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [categoryId]: { ...prev.channels[categoryId], [channel]: on },
      },
    }));
  };

  const offersEmail = channels.includes("email");
  const anyEmailOn = categories.some((c) => draft.channels[c.id]?.email);
  const dirty = !samePreferences(categories, channels, draft, preferences);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch {
      setError("Nastavení se nepodařilo uložit. Zkuste to znovu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={title}
      description={description}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() =>
              setDraft(
                resolveNotificationPreferences(
                  categories,
                  defaultNotificationPreferences(categories),
                ),
              )
            }
            disabled={saving}
            className="sm:mr-auto"
          >
            <RotateCcw data-icon="inline-start" />
            Obnovit výchozí
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Ukládám…
              </>
            ) : (
              "Uložit"
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col">
          {/* Hlavička sloupců je jen vizuální — každý přepínač nese vlastní aria-label. */}
          <div
            aria-hidden
            className="grid items-end gap-x-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${channels.length}, 3.5rem)` }}
          >
            <span>Co vám pošleme</span>
            {channels.map((ch) => {
              const Icon = CHANNEL_ICONS[ch];
              return (
                <span key={ch} className="flex flex-col items-center gap-1">
                  <Icon className="size-4" />
                  {NOTIFICATION_CHANNEL_LABELS[ch]}
                </span>
              );
            })}
          </div>

          {categories.map((category) => {
            const locked = lockedIn(category, channels);
            return (
            <div
              key={category.id}
              className="grid items-center gap-x-2 border-b border-border py-3 last:border-b-0"
              style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${channels.length}, 3.5rem)` }}
            >
              <div className="flex min-w-0 items-start gap-3">
                <NotificationCategoryIcon
                  category={category}
                  className="hidden size-8 sm:flex"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{category.label}</p>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                  {locked.length > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Lock className="size-3 shrink-0" aria-hidden />
                      {lockedHint(locked)}
                    </p>
                  )}
                </div>
              </div>

              {channels.map((ch) => {
                const isLocked = locked.includes(ch);
                return (
                  <div key={ch} className="flex justify-center">
                    <Switch
                      checked={isLocked || !!draft.channels[category.id]?.[ch]}
                      onCheckedChange={(on) => setChannel(category.id, ch, on)}
                      disabled={isLocked || saving}
                      aria-label={`${category.label}: ${NOTIFICATION_CHANNEL_LABELS[ch]}`}
                    />
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>

        {offersEmail && (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p id={digestLabelId} className="text-sm font-medium text-foreground">
                Jak často posílat e-maily
              </p>
              <p className="text-xs text-muted-foreground">
                {anyEmailOn
                  ? "Souhrn spojí notifikace za den nebo týden do jednoho e-mailu."
                  : "E-maily máte vypnuté u všech kategorií."}
              </p>
            </div>
            <SegmentedControl<EmailDigest>
              variant="soft"
              size="sm"
              value={draft.emailDigest}
              onValueChange={(emailDigest) => setDraft((prev) => ({ ...prev, emailDigest }))}
              disabled={!anyEmailOn || saving}
              aria-labelledby={digestLabelId}
              className="shrink-0"
            >
              {DIGEST_OPTIONS.map((option) => (
                <SegmentedControlItem key={option} value={option}>
                  {EMAIL_DIGEST_LABELS[option]}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

const LOCKED_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  inApp: "ve schránce",
  email: "e-mailem",
};

function lockedIn(category: NotificationCategory, channels: NotificationChannel[]) {
  return (category.locked ?? []).filter((ch) => channels.includes(ch));
}

/** „Ve schránce nelze vypnout." / „Ve schránce ani e-mailem nelze vypnout." */
function lockedHint(locked: NotificationChannel[]): string {
  const text = locked.map((ch) => LOCKED_CHANNEL_LABELS[ch]).join(" ani ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} nelze vypnout.`;
}

/** Porovná jen to, co modal ukazuje — nabízené kanály a frekvenci e-mailů. */
function samePreferences(
  categories: NotificationCategory[],
  channels: NotificationChannel[],
  a: NotificationPreferences,
  b: NotificationPreferences,
): boolean {
  if (channels.includes("email") && a.emailDigest !== b.emailDigest) return false;
  return categories.every((c) =>
    channels.every((ch) => !!a.channels[c.id]?.[ch] === !!b.channels[c.id]?.[ch]),
  );
}
