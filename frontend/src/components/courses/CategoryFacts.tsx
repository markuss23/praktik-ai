import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stavebnice pro zařazení kurzu a modulu na detailu kurzu (hlavička i karty
 * modulů). Na rozdíl od `CategoryTags` (štítky v adminu) čte data jako
 * přehled: popisek s ikonou, kód + název pod sebou a Bloom jako stupnice.
 */

export interface CategoryFactItem {
  code: string;
  name: string;
  description?: string | null;
}

/** Popisek skupiny — ikona + krátký text, výška řádku sedí s `CodeList`. */
export function FactLabel({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  /** Plný název skupiny jako tooltip, když je popisek zkrácený („KRAUU"). */
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** Položky číselníku pod sebou: kód (šedě) a název; popis jako tooltip. */
export function CodeList({
  items,
  clamp = false,
  className,
}: {
  items: CategoryFactItem[];
  /** Dlouhé názvy (KRAUU) zalomit nejvýš na dva řádky — plný text je v tooltipu. */
  clamp?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1", className)}>
      {items.map((item) => (
        <li
          key={item.code}
          title={clamp ? `${item.name}${item.description ? ` — ${item.description}` : ""}` : item.description || undefined}
          className="flex gap-2 text-[13px] leading-5"
        >
          {/* Šířka na „NP-08", ať názvy v sousedních skupinách začínají na stejné lince. */}
          <span className="min-w-10 shrink-0 font-semibold whitespace-nowrap text-muted-foreground tabular-nums">
            {item.code}
          </span>
          <span className={cn("min-w-0 break-words text-foreground", clamp && "line-clamp-2")}>{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

const BLOOM_STEPS = ["1", "2", "3", "4", "5", "6"];

/**
 * Bloomova taxonomie jako stupnice 1–6: úrovně modulu / kurzu jsou vyplněné,
 * ostatní šedé — je hned vidět, jak „vysoko" obsah míří. Pod stupnicí názvy
 * vybraných úrovní (ty nesou význam i pro čtečky, stupnice je `aria-hidden`).
 *
 * Výplň je neutrální (`foreground`), ne značková zelená — zelená segmentová
 * řada už na kartách znamená průběh a nesmí se s ní plést.
 */
export function BloomScale({ levels, className }: { levels: CategoryFactItem[]; className?: string }) {
  const sorted = [...levels].sort((a, b) => Number(a.code) - Number(b.code));
  const active = new Set(sorted.map((l) => l.code));

  return (
    <div className={className}>
      <ol aria-hidden className="flex gap-1">
        {BLOOM_STEPS.map((step) => (
          <li
            key={step}
            className={cn(
              "grid size-5 place-items-center rounded-[5px] text-[11px] leading-none font-semibold tabular-nums",
              active.has(step)
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground/70 ring-1 ring-foreground/[0.06] ring-inset",
            )}
          >
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-1.5 text-[13px] leading-5 text-foreground">{sorted.map((l) => l.name).join(" · ")}</p>
    </div>
  );
}
