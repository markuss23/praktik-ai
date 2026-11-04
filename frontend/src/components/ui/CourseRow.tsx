import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle, ChevronRight, Clock, FileText } from "lucide-react";
import { type Difficulty } from "@/api";
import { DIFFICULTY_LABELS } from "@/lib/difficulty";
import { cn, czechPlural } from "@/lib/utils";

import { buttonVariants } from "../ui-kit/button";
import { Progress } from "../ui-kit/progress";

interface CourseRowProps {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty?: Difficulty | null;
  completedModules?: number;
  totalModules?: number;
  imageUrl?: string;
  isEnrolled?: boolean;
  isCompleted?: boolean;
}

/**
 * Řádková podoba `CourseCard` pro výpis „Řádky" v katalogu — stejná data
 * i stavy (nezapsán / rozpracováno / dokončeno), jen naležato a bez velkého
 * obrázku. Řádky se skládají pod sebe do jedné bílé plochy (`<ul>` s
 * `divide-y`, každý řádek v `<li>`), proto řádek sám nemá rámeček ani stín.
 *
 * Sloupce přibývají se šířkou: mobil = náhled + název + meta pod ním
 * a šipka, od `sm` tlačítko, od `lg` samostatný sloupec s meta, od `xl`
 * průběh.
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
}: CourseRowProps) {
  const hasProgress = totalModules > 0;
  const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const difficultyLabel = difficulty ? DIFFICULTY_LABELS[difficulty] : "Začátečník";

  const meta = (
    <>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Clock className="size-4" />
        {duration} minut
      </span>
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium whitespace-nowrap text-foreground">
        {difficultyLabel}
      </span>
    </>
  );

  const row = (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 transition-colors sm:px-5",
        // Pevné šířky drží sloupce zarovnané napříč řádky, i když se liší
        // tlačítko („Pokračovat" × „Zobrazit" × „Dokončeno").
        "lg:grid-cols-[auto_minmax(0,1fr)_220px_132px] xl:grid-cols-[auto_minmax(0,1fr)_220px_190px_132px]",
        isCompleted ? "bg-success/5" : "group-hover:bg-muted/50",
      )}
    >
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md sm:h-16 sm:w-28">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="112px"
          className={cn("object-cover transition-transform duration-300", !isCompleted && "group-hover:scale-105")}
        />
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/30">
            <CheckCircle className="size-6 text-white drop-shadow" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3
          className={cn(
            "line-clamp-2 text-base font-semibold sm:line-clamp-1 sm:text-lg",
            isCompleted ? "text-success" : "text-foreground transition-colors group-hover:text-gradient-r",
          )}
        >
          {title}
        </h3>
        <p className="mt-0.5 hidden truncate text-sm text-muted-foreground sm:block">{description}</p>
        {/* Pod lg nemá meta vlastní sloupec, jede pod názvem. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:hidden">
          {meta}
        </div>
      </div>

      <div className="hidden items-center gap-3 text-sm text-muted-foreground lg:flex">{meta}</div>

      <div className="hidden xl:block">
        {hasProgress && (
          <>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-foreground">
                <FileText className="size-4 text-muted-foreground" />
                {completedModules}/{totalModules} {czechPlural(totalModules, "modul", "moduly", "modulů")}
              </span>
              <span
                className={cn(
                  "font-medium",
                  isCompleted ? "text-success" : isEnrolled ? "text-primary" : "text-muted-foreground",
                )}
              >
                {isCompleted ? "Hotovo" : isEnrolled ? `${progressPercent}%` : "Nezapsán"}
              </span>
            </div>
            <Progress
              value={isEnrolled || isCompleted ? progressPercent : 0}
              className="w-full [&_[data-slot=progress-track]]:h-1.5"
            />
          </>
        )}
      </div>

      {isCompleted ? (
        <span className="inline-flex items-center gap-1.5 justify-self-end text-sm font-semibold whitespace-nowrap text-success">
          <CheckCircle className="size-4.5" />
          <span className="hidden sm:inline">Dokončeno</span>
        </span>
      ) : (
        <>
          {/* Celý řádek je odkaz — tlačítko je jen vizuál, proto <span>. */}
          <span
            className={cn(
              buttonVariants({ variant: isEnrolled ? "brand" : "default", size: "lg" }),
              "hidden justify-self-end px-4 font-semibold sm:inline-flex",
            )}
          >
            {isEnrolled ? "Pokračovat" : "Zobrazit"}
            <ArrowRight data-icon="inline-end" className="size-4" />
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted-foreground sm:hidden" />
        </>
      )}
    </div>
  );

  // Completed courses are not clickable
  if (isCompleted) {
    return row;
  }

  return (
    <Link href={`/courses/${id}`} className="group block outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
      {row}
    </Link>
  );
}
