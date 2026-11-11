import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationCategory, NotificationTone } from "./types";

const TONE_CLASSES: Record<NotificationTone, string> = {
  primary: "bg-primary/15 text-primary",
  tip: "bg-tip/15 text-tip",
  warning: "bg-warning/15 text-warning",
  "brand-accent": "bg-brand-accent/15 text-brand-accent",
  "gradient-r": "bg-gradient-r/15 text-gradient-r",
  destructive: "bg-destructive/15 text-destructive",
};

/** Kategorie, kterou frontend nezná (backend ji poslal dřív, než sem přibyla). */
export const FALLBACK_NOTIFICATION_CATEGORY: NotificationCategory = {
  id: "other",
  label: "Oznámení",
  description: "",
  icon: Bell,
  tone: "primary",
  defaults: { inApp: true, email: false },
};

/** Tónované kolečko s ikonou kategorie — ve schránce i v nastavení. */
export function NotificationCategoryIcon({
  category,
  className,
}: {
  category: NotificationCategory;
  className?: string;
}) {
  const Icon = category.icon;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        TONE_CLASSES[category.tone],
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
