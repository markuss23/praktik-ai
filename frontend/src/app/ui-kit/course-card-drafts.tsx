import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Check, CheckCircle } from "lucide-react";

import {
  CategoryBubble,
  CourseCta,
  CourseMeta,
  CourseProgressBlock,
  getCourseStatus,
  type CourseItemProps,
  type CourseStatus,
} from "@/components/ui/CourseItemParts";
import { cn } from "@/lib/utils";

/**
 * Návrhy nových karet kurzu pro `/ui-kit`. Data, stavy i spodní blok (meta,
 * průběh, CTA) jsou stejné jako u `CourseCard` — liší se jen hlavička karty.
 * Až se některý návrh vybere, přesune se do `components/ui` vedle `CourseCard`.
 */

/** Plášť a odkaz 1:1 jako `CourseCard`: hover zvedne kartu, hotový kurz nikam nevede. */
function DraftShell({
  id,
  href,
  status,
  className,
  children,
}: {
  id: string;
  href?: string;
  status: CourseStatus;
  className?: string;
  children: ReactNode;
}) {
  const done = status === "done";

  const card = (
    <article
      className={cn(
        "h-full overflow-hidden rounded-xl border bg-card shadow-sm transition-[box-shadow,transform,border-color] duration-300",
        done
          ? "border-success/40"
          : "border-border group-hover:-translate-y-1 group-hover:border-foreground/15 group-hover:shadow-lg group-focus-visible:-translate-y-1 group-focus-visible:shadow-lg",
        className,
      )}
    >
      {children}
    </article>
  );

  if (done) return <div className="h-full">{card}</div>;

  return (
    <Link
      href={href ?? `/courses/${id}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {card}
    </Link>
  );
}

/** Spodek karty — stejný jako u `CourseCard`, `mt-auto` srovná CTA v řádku na jednu linku. */
function DraftBottom({
  status,
  duration,
  difficulty,
  completedModules,
  totalModules,
}: {
  status: CourseStatus;
  duration: number;
  difficulty: CourseItemProps["difficulty"];
  completedModules: number;
  totalModules: number;
}) {
  return (
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
  );
}

/**
 * Návrh A — obrázek jen na čtvrtině karty.
 *
 * Mřížka `1fr / 3fr`: obrázek nemá vlastní výšku, takže obsah určí tři díly
 * a obrázek dostane přesně čtvrtinu karty. Platí to i když se karta v gridu
 * natáhne na nejvyšší v řádku — pak se dělí natažená výška.
 */
export function CourseCardBanner({
  id,
  title,
  description,
  duration,
  difficulty,
  category,
  completedModules = 0,
  totalModules = 0,
  imageUrl = "/courseai2.png",
  isEnrolled = false,
  isCompleted = false,
  href,
}: CourseItemProps) {
  const status = getCourseStatus(isEnrolled, isCompleted);
  const done = status === "done";

  return (
    <DraftShell id={id} href={href} status={status} className="grid grid-rows-[1fr_3fr]">
      <div className="relative min-h-0 overflow-hidden bg-muted">
        {/* Dekorativní — název kurzu je hned pod obrázkem. */}
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 360px, 100vw"
          className={cn(
            "object-cover transition-transform duration-500",
            done ? "opacity-80" : "group-hover:scale-[1.04]",
          )}
        />
        {/* V nízkém pruhu by fajfka uprostřed narazila do bubliny — jde do rohu. */}
        {done && (
          <div className="absolute inset-0 flex items-end justify-end bg-success/25 p-3">
            <span className="rounded-full bg-card p-1.5 shadow-lg">
              <CheckCircle className="size-5 text-success" aria-hidden />
            </span>
          </div>
        )}
        {category && <CategoryBubble>{category}</CategoryBubble>}
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        <h3 className="line-clamp-2 text-lg leading-6 font-semibold text-foreground">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <DraftBottom
          status={status}
          duration={duration}
          difficulty={difficulty}
          completedModules={completedModules}
          totalModules={totalModules}
        />
      </div>
    </DraftShell>
  );
}

/**
 * Návrh B — místo fotky dlaždice s SVG coverem (`variant="icon"`), vedle ní
 * obor a název, pod nimi přes celou šířku popis. Karta je nižší a obor je
 * vidět i barvou dlaždice.
 */
export function CourseCardIcon({
  id,
  title,
  description,
  duration,
  difficulty,
  category,
  completedModules = 0,
  totalModules = 0,
  isEnrolled = false,
  isCompleted = false,
  href,
  icon,
}: CourseItemProps & {
  /** Cover modulu ve variantě `icon`, např. `<MathCover variant="icon" />`. */
  icon: ReactNode;
}) {
  const status = getCourseStatus(isEnrolled, isCompleted);
  const done = status === "done";

  return (
    <DraftShell id={id} href={href} status={status} className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <div
            className={cn(
              "size-full overflow-hidden rounded-2xl ring-1 ring-foreground/[0.06] transition-transform duration-300 motion-reduce:transition-none",
              done ? "opacity-80" : "group-hover:-rotate-3 group-hover:scale-105",
            )}
          >
            {icon}
          </div>
          {done && (
            <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-success text-white ring-3 ring-card">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0">
          {/* Bez fotky pod sebou bublina leží na bílé — stačí jí menší stín. */}
          {category && (
            <CategoryBubble className="static mb-2 block w-fit max-w-full shadow-[0_4px_12px_rgba(20,19,28,0.12)]">
              {category}
            </CategoryBubble>
          )}
          <h3 className="line-clamp-3 text-lg leading-6 font-semibold text-foreground">{title}</h3>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>

      <DraftBottom
        status={status}
        duration={duration}
        difficulty={difficulty}
        completedModules={completedModules}
        totalModules={totalModules}
      />
    </DraftShell>
  );
}
