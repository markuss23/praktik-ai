"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Inbox,
  Mail,
  MailCheck,
  RotateCw,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  Button,
  SegmentedControl,
  SegmentedControlItem,
  Skeleton,
} from "@/components/ui";
import { BTN_KEEP_BOX, cn, timeAgo } from "@/lib/utils";
import {
  FALLBACK_NOTIFICATION_CATEGORY,
  NotificationCategoryIcon,
} from "./NotificationCategoryIcon";
import type { AppNotification, NotificationCategory } from "./types";

type InboxFilter = "all" | "unread";

export interface NotificationInboxProps {
  notifications: AppNotification[];
  /** Kategorie profilu — ikona, barva a název u každé položky. */
  categories: NotificationCategory[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  /** Text prázdné schránky (filtr „Vše"). */
  emptyMessage?: string;
  /** Výška seznamu v px, nad kterou se roluje uvnitř karty. */
  maxListHeight?: number;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Ozubené kolečko v hlavičce — otevře nastavení notifikací. */
  onOpenSettings?: () => void;
  onRetry?: () => void;
  className?: string;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Schránka notifikací jako karta profilu. Čistě prezentační — data a akce
 * dostává zvenku, takže ji jde použít v profilu studenta i v adminu
 * (napojenou variantu viz `NotificationCenter`).
 *
 * Kliknutí na položku ji rozbalí (celý text, odkaz, akce) a označí jako přečtenou.
 */
export function NotificationInbox({
  notifications,
  categories,
  loading = false,
  error,
  title = "Schránka",
  emptyMessage = "Zatím tu nic není. Až se něco stane, najdete to tady.",
  maxListHeight = 400,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onOpenSettings,
  onRetry,
  className,
}: NotificationInboxProps) {
  const titleId = useId();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  // Rozbalená položka zůstává i ve filtru „Nepřečtené" — otevřením se označí
  // jako přečtená a jinak by uživateli zmizela pod rukama.
  const visible =
    filter === "unread"
      ? notifications.filter((n) => !n.read || n.id === expandedId)
      : notifications;

  const toggle = (n: AppNotification) => {
    setExpandedId((current) => (current === n.id ? null : n.id));
    if (!n.read) onMarkRead?.(n.id);
  };

  return (
    <section
      aria-labelledby={titleId}
      className={cn("bg-card rounded-xl shadow-sm p-6", className)}
    >
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="size-5 shrink-0 text-foreground" aria-hidden />
        <h3 id={titleId} className="text-base font-bold text-foreground truncate">
          {title}
        </h3>
        {unreadCount > 0 && (
          <span
            title={`Nepřečtené: ${unreadCount}`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary"
          >
            {unreadCount}
          </span>
        )}
        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSettings}
            aria-label="Nastavení notifikací"
            title="Nastavení notifikací"
            className="ml-auto"
          >
            <Settings2 />
          </Button>
        )}
      </div>

      <SegmentedControl<InboxFilter>
        variant="soft"
        size="sm"
        value={filter}
        onValueChange={setFilter}
        aria-label="Filtr schránky"
        className="mb-3"
      >
        <SegmentedControlItem value="all">Vše</SegmentedControlItem>
        <SegmentedControlItem value="unread">
          Nepřečtené{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </SegmentedControlItem>
      </SegmentedControl>

      {loading ? (
        <InboxSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw data-icon="inline-start" />
              Zkusit znovu
            </Button>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          {filter === "unread" ? (
            <MailCheck className="size-6 text-primary" aria-hidden />
          ) : (
            <Inbox className="size-6 text-muted-foreground" aria-hidden />
          )}
          <p className="text-sm text-muted-foreground">
            {filter === "unread" ? "Všechno máte přečtené." : emptyMessage}
          </p>
        </div>
      ) : (
        // Předěly mezi zprávami — na bílé kartě profilu by jinak položky
        // splývaly. `overscroll-contain` drží kolečko v seznamu, dokud je kam rolovat.
        <ul
          className="flex flex-col divide-y divide-border overflow-y-auto overscroll-contain"
          style={{ maxHeight: maxListHeight }}
        >
          {visible.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              category={categoryById.get(n.category) ?? FALLBACK_NOTIFICATION_CATEGORY}
              expanded={expandedId === n.id}
              onToggle={() => toggle(n)}
              onMarkUnread={
                onMarkUnread
                  ? () => {
                      onMarkUnread(n.id);
                      setExpandedId(null);
                    }
                  : undefined
              }
              onDelete={onDelete ? () => onDelete(n.id) : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationItem({
  notification: n,
  category,
  expanded,
  onToggle,
  onMarkUnread,
  onDelete,
}: {
  notification: AppNotification;
  category: NotificationCategory;
  expanded: boolean;
  onToggle: () => void;
  onMarkUnread?: () => void;
  onDelete?: () => void;
}) {
  const bodyId = useId();
  const hasActions = !!(n.href || onMarkUnread || onDelete);

  return (
    <li
      className={cn(
        "shrink-0 transition-colors",
        n.read ? "hover:bg-muted/60" : "bg-primary/5 hover:bg-primary/10",
        expanded && "bg-muted/60",
      )}
    >
      {/* `ring-inset` — seznam ořezává obsah (rolování), vnější focus ring by se uřízl. */}
      <Button
        variant="plain"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={expanded && hasActions ? bodyId : undefined}
        className={cn(
          BTN_KEEP_BOX,
          "w-full items-start justify-start gap-3 whitespace-normal rounded-none p-3 text-left font-normal focus-visible:ring-inset",
        )}
      >
        <NotificationCategoryIcon category={category} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-start gap-2">
            <span
              className={cn(
                "flex-1 text-sm text-foreground",
                n.read ? "font-medium" : "font-semibold",
                !expanded && "line-clamp-2",
              )}
            >
              {n.title}
            </span>
            {!n.read && (
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                <span className="sr-only">Nepřečteno</span>
              </span>
            )}
          </span>
          {n.body && (
            <span
              className={cn(
                "text-xs text-muted-foreground",
                !expanded && "line-clamp-2",
              )}
            >
              {n.body}
            </span>
          )}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <span>{category.label}</span>
            <span aria-hidden>·</span>
            <time
              dateTime={n.createdAt.toISOString()}
              title={DATE_TIME_FORMAT.format(n.createdAt)}
            >
              {timeAgo(n.createdAt)}
            </time>
            {expanded && n.actorName && (
              <>
                <span aria-hidden>·</span>
                <span>{n.actorName}</span>
              </>
            )}
          </span>
        </span>
      </Button>

      {expanded && hasActions && (
        <div id={bodyId} className="flex flex-wrap items-center gap-1.5 px-3 pb-3 pl-15">
          {n.href && (
            <Button
              size="xs"
              variant="outline"
              render={<Link href={n.href} />}
              nativeButton={false}
            >
              Otevřít
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          )}
          {onMarkUnread && (
            <Button size="xs" variant="ghost" onClick={onMarkUnread}>
              <Mail data-icon="inline-start" />
              Nepřečteno
            </Button>
          )}
          {onDelete && (
            <Button size="xs" variant="ghost-destructive" onClick={onDelete} className="ml-auto">
              <Trash2 data-icon="inline-start" />
              Smazat
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function InboxSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
