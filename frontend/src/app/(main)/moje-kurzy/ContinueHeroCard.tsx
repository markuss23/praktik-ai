'use client';

import Image from 'next/image';
import { ArrowRight, BookOpen, Clock, Play } from 'lucide-react';
import type { MyEnrollmentExtended } from '@/lib/api-client';

interface ContinueHeroCardProps {
  enrollment: MyEnrollmentExtended;
}

export function ContinueHeroCard({ enrollment }: ContinueHeroCardProps) {
  const total = enrollment.totalModules ?? enrollment.course.modulesCount ?? 0;
  const done = enrollment.completedModules ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remainingMinutes = Math.max(0, (total - done) * 20);

  const next = enrollment.nextModule ?? null;
  // Resume target: skutečně otevřený modul má přednost před next-module;
  // bez nich spadni na detail kurzu.
  const resumeModuleId = enrollment.lastVisitedModuleId ?? next?.moduleId ?? null;
  const href = resumeModuleId ? `/modules/${resumeModuleId}` : `/courses/${enrollment.courseId}`;

  return (
    <a
      href={href}
      className="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
      style={{ backgroundColor: 'var(--gradient-r)' }}
    >
      {/* Decentní dekorace místo gradientu — jemné obrysové kruhy v rohu */}
      <svg
        className="pointer-events-none absolute -right-10 -bottom-16 size-56 text-primary-foreground/10"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="98" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="100" r="42" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="relative flex flex-col md:flex-row">
        <div className="relative w-full md:w-[340px] h-[200px] md:h-auto shrink-0 overflow-hidden">
          <Image
            src="/courseai2.png"
            alt={enrollment.course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 md:bg-[var(--gradient-r)]/25" />
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-gradient-r">
            <Play size={12} className="fill-current" />
            Pokračuj kde jsi skončil
          </div>
        </div>

        <div className="flex-1 p-6 sm:p-8 text-primary-foreground flex flex-col justify-between min-w-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-2 line-clamp-2">
              {enrollment.course.title}
            </h2>

            {next ? (
              <p className="text-primary-foreground/90 text-sm sm:text-base">
                <span className="text-primary-foreground/60">Další lekce: </span>
                <span className="font-medium">
                  {next.index}/{next.total} — {next.title}
                </span>
              </p>
            ) : (
              <p className="text-primary-foreground/80 text-sm">Otevřít kurz</p>
            )}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <div className="flex items-center gap-1.5 text-primary-foreground/90">
                <BookOpen size={14} />
                <span>
                  {done}/{total} modulů
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-primary-foreground/90">
                <Clock size={14} />
                <span>~{remainingMinutes} min do konce</span>
              </div>
              <span className="font-bold text-primary-foreground">{pct}%</span>
            </div>
            <div className="h-2.5 bg-card/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-card rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 bg-card text-gradient-r font-semibold px-5 py-2.5 rounded-lg shadow group-hover:shadow-lg group-hover:translate-x-0.5 transition-all">
              {next ? 'Pokračovat v lekci' : 'Otevřít kurz'}
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
