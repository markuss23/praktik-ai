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
 * a šipka, od `sm` popis a tlačítko, od `xl` samostatný sloupec s průběhem.
 * Meta (délka, obtížnost) jede vždy pod popisem — jako vlastní sloupec se
 * mačkala a název s popisem neměly kde dýchat.
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
  const startedOrDone = isEnrolled || isCompleted;
  const modulesLabel = startedOrDone
    ? `${completedModules}/${totalModules} ${czechPlural(totalModules, "modul", "moduly", "modulů")}`
    : `${totalModules} ${czechPlural(totalModules, "modul", "moduly", "modulů")}`;

  const row = (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 transition-colors sm:gap-6 sm:px-6 sm:py-6",
        // Pevné šířky drží sloupce zarovnané napříč řádky, i když se liší
        // tlačítko („Pokračovat" × „Zobrazit" × „Dokončeno").
        "xl:grid-cols-[auto_minmax(0,1fr)_220px_150px] xl:gap-8",
        isCompleted ? "bg-success/5" : "group-hover:bg-muted/50",
      )}
    >
      <div className="relative h-16 w-24 shrink-0 self-start overflow-hidden rounded-lg sm:h-24 sm:w-36 sm:self-center">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 144px, 96px"
          className={cn("object-cover transition-transform duration-300", !isCompleted && "group-hover:scale-105")}
        />
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/30">
            <CheckCircle className="size-7 text-white drop-shadow" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3
          className={cn(
            "line-clamp-2 text-lg leading-snug font-semibold sm:text-xl",
            isCompleted ? "text-success" : "text-foreground transition-colors group-hover:text-gradient-r",
          )}
        >
          {title}
        </h3>
        <p className="mt-1.5 hidden max-w-[65ch] text-[15px] leading-relaxed text-muted-foreground sm:line-clamp-2">
          {description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="size-4" />
            {duration} minut
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium whitespace-nowrap text-foreground">
            {difficultyLabel}
          </span>
          {/* Pod xl nemá průběh vlastní sloupec — aspoň počet modulů jede sem. */}
          {hasProgress && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap xl:hidden">
              <FileText className="size-4" />
              {modulesLabel}
              {isEnrolled && !isCompleted && (
                <span className="font-medium text-primary">· {progressPercent}%</span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="hidden xl:block">
        {hasProgress && (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-foreground">
                <FileText className="size-4 text-muted-foreground" />
                {modulesLabel}
              </span>
              <span
                className={cn(
                  "font-semibold",
                  isCompleted ? "text-success" : isEnrolled ? "text-primary" : "text-muted-foreground font-medium",
                )}
              >
                {startedOrDone ? `${progressPercent}%` : "Nezapsán"}
              </span>
            </div>
            {/* Prázdný pruh u nezapsaných kurzů jen přidával šum. */}
            {startedOrDone && (
              <Progress
                value={progressPercent}
                className="mt-2.5 w-full [&_[data-slot=progress-track]]:h-2"
              />
            )}
          </>
        )}
      </div>

      {isCompleted ? (
        <span className="inline-flex items-center gap-1.5 justify-self-end text-[15px] font-semibold whitespace-nowrap text-success xl:justify-self-center">
          <CheckCircle className="size-5" />
          <span className="hidden sm:inline">Dokončeno</span>
        </span>
      ) : (
        <>
          {/* Celý řádek je odkaz — tlačítko je jen vizuál, proto <span>. */}
          <span
            className={cn(
              buttonVariants({ variant: isEnrolled ? "brand" : "default", size: "lg" }),
              "hidden justify-self-end px-5 font-semibold sm:inline-flex xl:w-full xl:justify-self-stretch",
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
