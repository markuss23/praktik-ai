import type { ReactNode } from "react";
import { ArrowRight, CheckCircle, Clock, FileText } from "lucide-react";
import { type Difficulty } from "@/api";
import { DIFFICULTY_LABELS } from "@/lib/difficulty";
import { cn, czechPlural } from "@/lib/utils";

/**
 * Společné kusy `CourseCard` (karta) a `CourseRow` (řádek). Obě podoby čtou
 * stejná data a mají stejné stavy, takže stav, průběh, meta i CTA se počítají
 * a kreslí na jednom místě — karta a řádek se tak nemůžou rozejít.
 */

export interface CourseItemProps {
  id: string;
  title: string;
  description: string;
  duration: number;
  /** Doporučená obtížnost. Pokud není uvedena, fallback na „Začátečník". */
  difficulty?: Difficulty | null;
  completedModules?: number;
  totalModules?: number;
  imageUrl?: string;
  isEnrolled?: boolean;
  isCompleted?: boolean;
  /** Kam vede klik. Výchozí je detail kurzu; zapsaný kurz může vést rovnou na rozpracovaný modul. */
  href?: string;
}

/** `idle` = nezapsán · `active` = zapsán, rozpracováno · `done` = dokončeno */
export type CourseStatus = "idle" | "active" | "done";

export function getCourseStatus(isEnrolled: boolean, isCompleted: boolean): CourseStatus {
  if (isCompleted) return "done";
  return isEnrolled ? "active" : "idle";
}

export function modulesWord(n: number) {
  return czechPlural(n, "modul", "moduly", "modulů");
}

/** Meta pod popisem: délka + obtížnost. */
export function CourseMeta({
  duration,
  difficulty,
  className,
  children,
}: {
  duration: number;
  difficulty?: Difficulty | null;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Clock className="size-4" aria-hidden />
        {duration} minut
      </span>
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap text-foreground ring-1 ring-foreground/[0.06] ring-inset">
        {difficulty ? DIFFICULTY_LABELS[difficulty] : "Začátečník"}
      </span>
      {children}
    </div>
  );
}

/** Nad tímto počtem modulů by segmenty byly jen čárky — přepne se na plynulý pruh. */
const MAX_SEGMENTS = 12;

/**
 * Průběh po modulech: jeden segment = jeden modul. Na první pohled je vidět,
 * kolik modulů kurz má i kolik z nich je hotových. U nezapsaných kurzů jsou
 * segmenty šedé — ukazují rozsah kurzu, ne „nulový pokrok".
 */
export function ModuleProgress({
  completed,
  total,
  status,
  className,
}: {
  completed: number;
  total: number;
  status: CourseStatus;
  className?: string;
}) {
  const done = status === "done" ? total : Math.min(completed, total);
  const filled = status === "idle" ? 0 : done;
  const a11y =
    status === "idle"
      ? { "aria-hidden": true }
      : {
          role: "progressbar",
          "aria-valuemin": 0,
          "aria-valuemax": total,
          "aria-valuenow": done,
          "aria-label": `Splněno ${done} z ${total} ${modulesWord(total)}`,
        };

  if (total > MAX_SEGMENTS) {
    const percent = Math.round((filled / total) * 100);
    return (
      <div {...a11y} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]", className)}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    );
  }

  return (
    <div {...a11y} className={cn("flex w-full gap-1", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            i < filled ? "bg-primary" : "bg-foreground/[0.08]",
          )}
        />
      ))}
    </div>
  );
}

/** Počet modulů vlevo, stav vpravo, pod tím segmentovaný průběh. */
export function CourseProgressBlock({
  status,
  completedModules,
  totalModules,
  className,
}: {
  status: CourseStatus;
  completedModules: number;
  totalModules: number;
  className?: string;
}) {
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-foreground">
          <FileText className="size-4 text-muted-foreground" aria-hidden />
          {status === "idle"
            ? `${totalModules} ${modulesWord(totalModules)}`
            : `${status === "done" ? totalModules : completedModules}/${totalModules} ${modulesWord(totalModules)}`}
        </span>
        <span
          className={cn(
            "whitespace-nowrap tabular-nums",
            status === "idle" ? "text-muted-foreground" : "font-semibold text-primary",
          )}
        >
          {status === "idle" ? "Nezapsáno" : status === "done" ? "100%" : `${percent}%`}
        </span>
      </div>
      <ModuleProgress completed={completedModules} total={totalModules} status={status} />
    </div>
  );
}

const CTA_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-200";

/**
 * Akce na kartě i v řádku.
 * - Pokračovat: plná značková zelená, na hover o stupeň tmavší.
 * - Zobrazit: tmavá neutrální, na hover (i focus) se přebarví do zelené.
 * Hover se bere z rodičovského `group` — celý řádek / karta je jeden odkaz,
 * CTA je jen vizuál (`<span>`), aby se do `<a>` nevnořoval `<button>`.
 */
const CTA_TONE: Record<CourseStatus, string> = {
  active:
    "bg-primary text-primary-foreground shadow-sm group-hover:bg-[color-mix(in_oklch,var(--primary),black_12%)] group-focus-visible:bg-[color-mix(in_oklch,var(--primary),black_12%)]",
  idle:
    "bg-foreground text-background shadow-sm group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground",
  done: "bg-success/10 text-success",
};

const CTA_SIZE = {
  md: "h-11 px-5 text-[15px]",
  sm: "h-10 px-4 text-sm",
} as const;

export function CourseCta({
  status,
  size = "md",
  compact = false,
  className,
}: {
  status: CourseStatus;
  size?: keyof typeof CTA_SIZE;
  /** Kratší popisky do úzkého sloupce řádku („Zobrazit" místo „Zobrazit kurz"). */
  compact?: boolean;
  className?: string;
}) {
  if (status === "done") {
    return (
      <span className={cn(CTA_BASE, CTA_SIZE[size], CTA_TONE.done, className)}>
        <CheckCircle className="size-4.5" aria-hidden />
        {compact ? "Dokončeno" : "Kurz dokončen"}
      </span>
    );
  }

  return (
    <span className={cn(CTA_BASE, CTA_SIZE[size], CTA_TONE[status], className)}>
      {status === "active" ? "Pokračovat" : compact ? "Zobrazit" : "Zobrazit kurz"}
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </span>
  );
}
