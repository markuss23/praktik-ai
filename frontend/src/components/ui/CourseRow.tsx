import Link from "next/link";
import Image from "next/image";
import { CheckCircle, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  CourseCta,
  CourseMeta,
  CourseProgressBlock,
  getCourseStatus,
  modulesWord,
  type CourseItemProps,
} from "./CourseItemParts";

/**
 * Řádková podoba `CourseCard` pro výpis „Řádky" — stejná data, stejné stavy
 * i stejné kusy (meta, segmentovaný průběh, CTA). Řádky se skládají pod sebe
 * do jedné bílé plochy (`<ul>` s `divide-y`), proto řádek sám nemá rámeček.
 *
 * Sloupce přibývají se šířkou:
 * - mobil: náhled + název + meta, vpravo šipka (celý řádek je odkaz),
 * - `sm`: přibude popis a tlačítko,
 * - `xl`: průběh dostane vlastní sloupec. Má ho každý řádek (i nezapsaný
 *   ukazuje počet modulů), takže tlačítka i průběhy lícují pod sebou.
 */
export function CourseRow({
  id,
  title,
  description,
  duration,
  difficulty,
  completedModules = 0,
  totalModules = 0,
  imageUrl = "/courseai2.png",
  isEnrolled = false,
  isCompleted = false,
  href,
}: CourseItemProps) {
  const status = getCourseStatus(isEnrolled, isCompleted);
  const done = status === "done";
  const hasProgress = totalModules > 0;
  const percent = hasProgress ? Math.round((completedModules / totalModules) * 100) : 0;

  const row = (
    <div
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5",
        "xl:grid-cols-[auto_minmax(0,1fr)_200px_168px] xl:gap-8",
        done ? "bg-success/[0.04]" : "transition-colors duration-200 group-hover:bg-muted/70 group-focus-visible:bg-muted/70",
      )}
    >
      {/* Akcent vlevo — tichá značka, že kurz je rozpracovaný. */}
      {status === "active" && (
        <span aria-hidden className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-primary sm:inset-y-5" />
      )}

      <div className="relative aspect-[16/10] w-20 shrink-0 self-start overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/[0.06] sm:w-40 sm:self-center">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 160px, 80px"
          className={cn("object-cover transition-transform duration-500", done ? "opacity-80" : "group-hover:scale-[1.06]")}
        />
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/30">
            <CheckCircle className="size-7 text-white drop-shadow" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-base leading-snug font-semibold text-foreground sm:text-lg">{title}</h3>
        <p className="mt-1 hidden max-w-[68ch] text-sm leading-6 text-muted-foreground sm:line-clamp-2">
          {description}
        </p>
        <CourseMeta
          duration={duration}
          difficulty={difficulty}
          className="mt-2 gap-x-3 text-[13px] sm:mt-3 sm:gap-x-4 sm:text-sm"
        >
          {/* Pod xl nemá průběh vlastní sloupec — počet modulů a procenta jedou sem. */}
          {hasProgress && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap xl:hidden">
              <FileText className="size-4" aria-hidden />
              {status === "idle"
                ? `${totalModules} ${modulesWord(totalModules)}`
                : `${done ? totalModules : completedModules}/${totalModules} ${modulesWord(totalModules)}`}
              {status !== "idle" && (
                <span className="font-semibold text-primary tabular-nums">· {done ? 100 : percent}%</span>
              )}
            </span>
          )}
        </CourseMeta>
      </div>

      <div className="hidden xl:block">
        {hasProgress && (
          <CourseProgressBlock status={status} completedModules={completedModules} totalModules={totalModules} />
        )}
      </div>

      <div className="justify-self-end xl:justify-self-stretch">
        <CourseCta status={status} size="sm" compact className="hidden w-full sm:inline-flex" />
        {done ? (
          <CheckCircle aria-label="Dokončeno" className="size-5 text-success sm:hidden" />
        ) : (
          <ChevronRight aria-hidden className="size-5 text-muted-foreground sm:hidden" />
        )}
      </div>
    </div>
  );

  // Dokončený kurz už nikam nevede — detail kurzu ho přesměruje pryč.
  if (done) {
    return row;
  }

  return (
    <Link
      href={href ?? `/courses/${id}`}
      className="group block outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      {row}
    </Link>
  );
}

/** Zástupný řádek při načítání — stejná mřížka jako `CourseRow`. */
export function CourseRowSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5 xl:grid-cols-[auto_minmax(0,1fr)_200px_168px] xl:gap-8">
      <div className="aspect-[16/10] w-20 rounded-lg bg-muted sm:w-40" />
      <div className="space-y-2.5">
        <div className="h-5 w-1/2 rounded bg-muted" />
        <div className="hidden h-3.5 w-5/6 rounded bg-muted sm:block" />
        <div className="h-5 w-48 rounded bg-muted" />
      </div>
      <div className="hidden space-y-2.5 xl:block">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-1.5 w-full rounded-full bg-muted" />
      </div>
      <div className="hidden h-10 w-28 rounded-lg bg-muted sm:block xl:w-full" />
    </div>
  );
}
