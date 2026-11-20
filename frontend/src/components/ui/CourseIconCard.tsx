import Link from "next/link";
import { Check } from "lucide-react";

import { COVER_MOTIFS, type CoverMotif, type CoverTone } from "@/components/ui-kit/module-covers";
import { cn } from "@/lib/utils";

import {
  CourseCta,
  CourseMeta,
  CourseProgressBlock,
  getCourseStatus,
  type CourseCover,
  type CourseItemProps,
} from "./CourseItemParts";

/**
 * Barva dlaždice podle bloku kurzu — příbuzné kurzy sdílí barvu, stejně jako
 * u coverů modulů (`module-covers.tsx`).
 */
const BLOCK_TONES: Record<string, CoverTone> = {
  "blok.a": "green", // Kontext — principy AI
  "blok.b": "purple", // Transformace — redesign výuky a hodnocení
  "blok.c": "blue", // Aplikace — oborové kurzy
};

/** Kurz bez bloku. */
const FALLBACK_TONE: CoverTone = "rose";

const MOTIFS = Object.keys(COVER_MOTIFS) as CoverMotif[];

/**
 * Cover dlaždice pro kurz. Kurzy zatím vlastní cover nemají, tak se odvodí
 * z dat: barva z bloku, motiv z id. Pro daný kurz je motiv stálý a kurzy
 * s po sobě jdoucími id dostanou různé motivy, takže se v mřížce střídají.
 * Až backend přinese cover kurzu, předá se rovnou do `cover`.
 */
export function courseCover(id: string | number, blockCode?: string | null): CourseCover {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    motif: MOTIFS[hash % MOTIFS.length],
    tone: (blockCode && BLOCK_TONES[blockCode]) || FALLBACK_TONE,
  };
}

/**
 * Karta kurzu s dlaždicí místo fotky: vlevo SVG cover (`variant="icon"`),
 * vedle něj obor jako popisek verzálkami a název, pod nimi přes celou šířku
 * popis. Spodní blok (meta, průběh, CTA) je stejný jako u `CourseCard`
 * a drží `mt-auto`, takže CTA sedí v řádku mřížky na jedné lince.
 *
 * Obor je jen text, bez bubliny — vedle barevné dlaždice by druhý barevný
 * prvek hlavičku přeplnil. Popisek má styl popisků pod čísly na landing page
 * (verzálky, kladný tracking, šedá).
 */
export function CourseIconCard({
  id,
  title,
  description,
  duration,
  difficulty,
  category,
  cover,
  completedModules = 0,
  totalModules = 0,
  isEnrolled = false,
  isCompleted = false,
  href,
}: CourseItemProps) {
  const status = getCourseStatus(isEnrolled, isCompleted);
  const done = status === "done";
  const { motif, tone } = cover ?? courseCover(id);
  const Cover = COVER_MOTIFS[motif];

  const card = (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-[box-shadow,transform,border-color] duration-300 sm:p-6",
        done
          ? "border-success/40"
          : "border-border group-hover:-translate-y-1 group-hover:border-foreground/15 group-hover:shadow-lg group-focus-visible:-translate-y-1 group-focus-visible:shadow-lg",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          {/* Dekorativní — název kurzu je hned vedle. */}
          <div
            className={cn(
              "size-full overflow-hidden rounded-2xl ring-1 ring-foreground/[0.06] transition-transform duration-300 motion-reduce:transition-none",
              done ? "opacity-80" : "group-hover:-rotate-3 group-hover:scale-105",
            )}
          >
            <Cover tone={tone} variant="icon" />
          </div>
          {done && (
            <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-success text-white ring-3 ring-card">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0">
          {category && (
            <p className="mb-1 truncate text-xs leading-4 font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {category}
            </p>
          )}
          <h3 className="line-clamp-3 text-lg leading-6 font-semibold text-foreground">{title}</h3>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>

      <div className="mt-auto pt-5">
        <CourseMeta duration={duration} difficulty={difficulty} />

        {totalModules > 0 && (
          <CourseProgressBlock
            status={status}
            completedModules={completedModules}
            totalModules={totalModules}
            className="mt-4 border-t border-border pt-4"
          />
        )}

        <CourseCta status={status} className="mt-5 w-full" />
      </div>
    </article>
  );

  // Dokončený kurz už nikam nevede — detail kurzu ho přesměruje pryč.
  if (done) {
    return <div className="h-full">{card}</div>;
  }

  return (
    <Link
      href={href ?? `/courses/${id}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {card}
    </Link>
  );
}

/** Zástupná karta při načítání — stejná kostra jako `CourseIconCard`. */
export function CourseIconCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 rounded-2xl bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="mt-2.5 h-5 w-full rounded bg-muted" />
          <div className="mt-2 h-5 w-2/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-5 h-3.5 w-full rounded bg-muted" />
      <div className="mt-2.5 h-3.5 w-5/6 rounded bg-muted" />
      <div className="mt-auto pt-6">
        <div className="flex gap-3">
          <div className="h-5 w-20 rounded bg-muted" />
          <div className="h-5 w-24 rounded-full bg-muted" />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted" />
        </div>
        <div className="mt-5 h-11 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}
