import Link from "next/link";
import { ArrowRight, Brain, ChartNoAxesColumnIncreasing, CheckCircle, GraduationCap, Lock, RotateCcw } from "lucide-react";
import type { Module } from "@/api";
import { cn } from "@/lib/utils";
import { BloomScale, CodeList, FactLabel } from "./CategoryFacts";

/**
 * Stav modulu na detailu kurzu:
 * `done` splněný · `current` první nesplněný (kde uživatel je) ·
 * `open` odemčený, ale ne na řadě · `locked` nezapsáno / nesplněn předchozí.
 */
export type ModuleCardStatus = "done" | "current" | "open" | "locked";

export interface ModuleCardProps {
  module: Pick<Module, "moduleId" | "title" | "perex" | "neuroPrinciples" | "krauuCompetences" | "bloomLevels">;
  /** Pořadí v kurzu od 1. */
  number: number;
  status: ModuleCardStatus;
  /** Skóre splněného modulu v %. */
  score?: number | null;
  /** Proč je modul zamčený („Zapište se do kurzu", „Nejdřív splňte modul 2"). */
  lockHint?: string;
}

const CARD_TONE: Record<ModuleCardStatus, string> = {
  done: "border-success/40 bg-card shadow-sm group-hover:-translate-y-1 group-hover:shadow-lg group-focus-visible:-translate-y-1 group-focus-visible:shadow-lg",
  current:
    "border-primary/60 bg-card shadow-md ring-1 ring-primary/20 group-hover:-translate-y-1 group-hover:shadow-lg group-focus-visible:-translate-y-1 group-focus-visible:shadow-lg",
  open: "border-border bg-card shadow-sm group-hover:-translate-y-1 group-hover:border-foreground/15 group-hover:shadow-lg group-focus-visible:-translate-y-1 group-focus-visible:shadow-lg",
  // Zamčený zůstává čitelný (ať je vidět, co modul nabízí) — jen ustoupí do pozadí.
  locked: "border-dashed border-foreground/15 bg-card/60",
};

const BADGE_TONE: Record<ModuleCardStatus, string> = {
  done: "bg-success/10 text-success",
  current: "bg-primary text-primary-foreground",
  open: "bg-foreground text-background",
  locked: "bg-muted text-muted-foreground",
};

const CTA_BASE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-200";

/** Stejné tóny jako `CourseCta` na kartě kurzu — CTA je jen vizuál, klik nese celá karta. */
const CTA_TONE = {
  current:
    "bg-primary text-primary-foreground shadow-sm group-hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] group-focus-visible:bg-[color-mix(in_oklch,var(--primary),black_12%)]",
  open: "bg-foreground text-background shadow-sm group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground",
  done: "bg-success/10 text-success group-hover:bg-success/20 group-focus-visible:bg-success/20",
};

function StatusChip({ status }: { status: ModuleCardStatus }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap";
  if (status === "done") {
    return (
      <span className={cn(base, "bg-success/10 text-success")}>
        <CheckCircle className="size-3.5" aria-hidden />
        Dokončeno
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className={cn(base, "bg-primary/10 text-primary")}>
        Aktuálně studujete
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span className={cn(base, "bg-muted text-muted-foreground")}>
        <Lock className="size-3.5" aria-hidden />
        Zamčeno
      </span>
    );
  }
  return null;
}

/**
 * Karta modulu na detailu kurzu — stejná stavba jako `CourseCard`: hlavička
 * (pořadí + stav), název a perex, přehled zařazení a dole patička s akcí,
 * která drží `mt-auto`, takže tlačítka v řádku mřížky sedí na jedné lince.
 */
export function ModuleCard({ module, number, status, score, lockHint }: ModuleCardProps) {
  const neuro = module.neuroPrinciples ?? [];
  const krauu = module.krauuCompetences ?? [];
  const bloom = module.bloomLevels ?? [];
  const hasFacts = neuro.length + krauu.length + bloom.length > 0;
  const locked = status === "locked";

  const card = (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border p-5 transition-[box-shadow,transform,border-color] duration-300 sm:p-6",
        CARD_TONE[status],
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums",
            BADGE_TONE[status],
          )}
        >
          <span className="sr-only">Modul </span>
          {String(number).padStart(2, "0")}
        </span>
        <StatusChip status={status} />
      </div>

      <h3
        title={module.title}
        className={cn(
          "mt-4 line-clamp-2 text-lg leading-6 font-semibold break-words",
          locked ? "text-foreground/70" : "text-foreground",
        )}
      >
        {module.title}
      </h3>
      {module.perex && (
        <p className="mt-2 line-clamp-3 text-sm leading-6 break-words text-muted-foreground">{module.perex}</p>
      )}

      {hasFacts && (
        <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-border pt-4">
          {neuro.length > 0 && (
            <>
              <dt>
                <FactLabel icon={Brain} title="Neurovědní principy">
                  Princip
                </FactLabel>
              </dt>
              <dd>
                <CodeList items={neuro} />
              </dd>
            </>
          )}
          {krauu.length > 0 && (
            <>
              <dt>
                <FactLabel icon={GraduationCap} title="KRAUU kompetence">
                  KRAUU
                </FactLabel>
              </dt>
              <dd>
                <CodeList items={krauu} clamp />
              </dd>
            </>
          )}
          {bloom.length > 0 && (
            <>
              <dt>
                <FactLabel icon={ChartNoAxesColumnIncreasing} title="Bloomova taxonomie">
                  Bloom
                </FactLabel>
              </dt>
              <dd>
                <BloomScale levels={bloom} />
              </dd>
            </>
          )}
        </dl>
      )}

      <div className="mt-auto pt-5">
        <div className="flex min-h-11 items-center justify-between gap-3 border-t border-border pt-4">
          {status === "done" && (
            <>
              <span className="text-sm text-muted-foreground">
                {score != null ? (
                  <>
                    Skóre <span className="font-semibold text-foreground tabular-nums">{score} %</span>
                  </>
                ) : (
                  "Splněno"
                )}
              </span>
              <span className={cn(CTA_BASE, CTA_TONE.done)}>
                <RotateCcw className="size-4" aria-hidden />
                Opakovat
              </span>
            </>
          )}
          {(status === "current" || status === "open") && (
            <span className={cn(CTA_BASE, CTA_TONE[status], "w-full")}>
              {status === "current" ? "Pokračovat" : "Začít modul"}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          )}
          {locked && (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" aria-hidden />
              {lockHint ?? "Modul je zamčený"}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (locked) {
    return <div className="h-full cursor-not-allowed">{card}</div>;
  }

  return (
    <Link
      href={`/modules/${module.moduleId}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {card}
    </Link>
  );
}

/** Zástupná karta při načítání — stejná kostra jako `ModuleCard`. */
export function ModuleCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <div className="size-10 rounded-lg bg-muted" />
        <div className="h-6 w-24 rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-5 w-3/4 rounded bg-muted" />
      <div className="mt-3 h-3.5 w-full rounded bg-muted" />
      <div className="mt-2 h-3.5 w-5/6 rounded bg-muted" />
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-5 w-36 rounded bg-muted" />
      </div>
      <div className="mt-auto pt-5">
        <div className="border-t border-border pt-4">
          <div className="h-11 w-full rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
