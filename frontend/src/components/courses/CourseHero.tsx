import type { ReactNode } from "react";
import Image from "next/image";
import { CheckCircle, ChartNoAxesColumnIncreasing, GraduationCap, Shapes } from "lucide-react";
import type { Course } from "@/api";
import {
  CategoryBubble,
  CourseMeta,
  CourseProgressBlock,
  courseCategoryLabel,
  type CourseStatus,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { BloomScale, CodeList, FactLabel } from "./CategoryFacts";

interface CourseHeroProps {
  course: Course;
  status: CourseStatus;
  completedModules: number;
  totalModules: number;
  /** Hlavní akce (zapsat se / pokračovat / přihlásit) — logiku drží stránka. */
  action?: ReactNode;
  className?: string;
}

/**
 * Hlavička detailu kurzu — zvětšená karta kurzu: obrázek s bublinou oboru,
 * název, popis, délka a obtížnost, průběh po modulech a hlavní akce.
 * Dole pás se zařazením kurzu (KRAUU, Bloom, průřezové obory).
 */
export function CourseHero({ course, status, completedModules, totalModules, action, className }: CourseHeroProps) {
  const category = courseCategoryLabel(course);
  const done = status === "done";

  const krauu = course.krauuCompetences ?? [];
  const bloom = course.bloomLevels ?? [];
  const cross = course.crossSubjects ?? [];
  const hasFacts = krauu.length + bloom.length + cross.length > 0;

  return (
    <section
      aria-labelledby="course-title"
      className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}
    >
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted lg:aspect-auto lg:min-h-[340px]">
          {/* Dekorativní — název kurzu je hned vedle. */}
          <Image
            src="/courseai2.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            className={cn("object-cover", done && "opacity-80")}
          />
          {done && (
            <div className="absolute inset-0 flex items-center justify-center bg-success/25">
              <span className="rounded-full bg-card p-3 shadow-lg">
                <CheckCircle className="size-8 text-success" aria-hidden />
              </span>
            </div>
          )}
          {category && <CategoryBubble>{category}</CategoryBubble>}
        </div>

        <div className="flex min-w-0 flex-col p-6 sm:p-8">
          <h1
            id="course-title"
            className="text-2xl leading-tight font-bold text-balance break-words text-foreground sm:text-3xl"
          >
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-3 max-w-[62ch] leading-7 break-words text-muted-foreground">{course.description}</p>
          )}

          {course.durationMinutes != null && (
            <CourseMeta duration={course.durationMinutes} difficulty={course.difficulty} className="mt-5" />
          )}

          <div className="mt-auto pt-6">
            {totalModules > 0 && (
              <CourseProgressBlock
                status={status}
                completedModules={completedModules}
                totalModules={totalModules}
                className="border-t border-border pt-5"
              />
            )}
            {action && <div className="mt-5 flex flex-wrap items-center gap-3">{action}</div>}
          </div>
        </div>
      </div>

      {hasFacts && (
        <div className="grid gap-x-8 gap-y-6 border-t border-border bg-muted/40 p-6 sm:p-8 md:grid-cols-3">
          {krauu.length > 0 && (
            <div className="min-w-0">
              <FactLabel icon={GraduationCap}>KRAUU kompetence</FactLabel>
              <CodeList items={krauu} className="mt-2" />
            </div>
          )}
          {bloom.length > 0 && (
            <div className="min-w-0">
              <FactLabel icon={ChartNoAxesColumnIncreasing}>Bloomova taxonomie</FactLabel>
              <BloomScale levels={bloom} className="mt-2" />
            </div>
          )}
          {cross.length > 0 && (
            <div className="min-w-0">
              <FactLabel icon={Shapes}>Průřezové obory</FactLabel>
              <CodeList items={cross} className="mt-2" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Zástupná hlavička při načítání — stejná kostra jako `CourseHero`. */
export function CourseHeroSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="aspect-[16/9] w-full bg-muted lg:aspect-auto lg:min-h-[340px]" />
        <div className="flex flex-col p-6 sm:p-8">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="mt-4 h-4 w-full rounded bg-muted" />
          <div className="mt-2.5 h-4 w-2/3 rounded bg-muted" />
          <div className="mt-5 flex gap-3">
            <div className="h-5 w-20 rounded bg-muted" />
            <div className="h-5 w-24 rounded-full bg-muted" />
          </div>
          <div className="mt-auto pt-6">
            <div className="border-t border-border pt-5">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted" />
            </div>
            <div className="mt-5 h-11 w-52 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
