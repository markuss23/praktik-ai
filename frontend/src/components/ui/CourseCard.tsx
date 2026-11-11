import Link from "next/link";
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  CourseCta,
  CourseMeta,
  CourseProgressBlock,
  getCourseStatus,
  type CourseItemProps,
} from "./CourseItemParts";

/**
 * Karta kurzu pro výpis „Karty". Výška se řídí obsahem a v mřížce se karty
 * natáhnou na nejvyšší v řádku (`h-full`); spodní blok (meta, průběh, CTA)
 * drží `mt-auto`, takže tlačítka sedí v řádku na jedné lince bez ohledu na
 * délku popisu.
 *
 * CTA je odsazené uvnitř karty — ne pruh přes celou šířku spodní hrany.
 */
export function CourseCard({
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

  const card = (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-[box-shadow,transform,border-color] duration-300",
        done
          ? "border-success/40"
          : "border-border group-hover:-translate-y-1 group-hover:border-foreground/15 group-hover:shadow-lg group-focus-visible:-translate-y-1 group-focus-visible:shadow-lg",
      )}
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-muted">
        {/* Dekorativní — název kurzu je hned pod obrázkem. */}
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-500",
            done ? "opacity-80" : "group-hover:scale-[1.04]",
          )}
        />
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/25">
            <span className="rounded-full bg-card p-3 shadow-lg">
              <CheckCircle className="size-7 text-success" aria-hidden />
            </span>
          </div>
        )}
      </div>

      <div className="flex grow flex-col p-5 sm:p-6">
        <h3 className="line-clamp-2 text-lg leading-6 font-semibold text-foreground">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>

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

/** Zástupná karta při načítání — stejná kostra jako `CourseCard`. */
export function CourseCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="aspect-[16/9] w-full bg-muted" />
      <div className="flex grow flex-col p-5 sm:p-6">
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="mt-4 h-3.5 w-full rounded bg-muted" />
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
    </div>
  );
}
