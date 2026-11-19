import { CourseHeroSkeleton } from "./CourseHero";
import { ModuleCardSkeleton } from "./ModuleCard";

/** Načítání detailu kurzu — stejné rozložení jako hotová stránka. */
export function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-muted" aria-busy="true">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-[100px]">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-foreground/[0.06]" />
        <CourseHeroSkeleton />
        <div className="mt-10 mb-5 h-7 w-40 animate-pulse rounded bg-foreground/[0.06] sm:mt-12" />
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
