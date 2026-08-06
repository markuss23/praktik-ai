'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle, ChevronRight, Clock } from 'lucide-react';
import type { MyEnrollmentExtended } from '@/lib/api-client';
import { czechPlural } from '@/lib/utils';

interface EnrollmentCardWithNextProps {
  enrollment: MyEnrollmentExtended;
}

export function EnrollmentCardWithNext({ enrollment }: EnrollmentCardWithNextProps) {
  const isCompleted = !!enrollment.completedAt;
  const total = enrollment.totalModules ?? enrollment.course.modulesCount ?? 0;
  const done = enrollment.completedModules ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const next = enrollment.nextModule ?? null;

  // Preferuj last_visited (= kde user opravdu byl), pak nextModule (= co
  // mu zbývá), nakonec spadni na detail kurzu.
  const resumeModuleId = enrollment.lastVisitedModuleId ?? next?.moduleId ?? null;
  const href = resumeModuleId ? `/modules/${resumeModuleId}` : `/courses/${enrollment.courseId}`;
  const courseHref = `/courses/${enrollment.courseId}`;
  const ctaLabel = isCompleted ? 'Zobrazit kurz' : next ? 'Pokračovat v lekci' : 'Otevřít kurz';

  return (
    <div
      className="bg-card rounded-xl shadow-sm border overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg"
      style={{ borderColor: isCompleted ? 'var(--success)' : 'var(--border)' }}
    >
      <Link href={courseHref} className="block relative overflow-hidden shrink-0 h-[180px] group">
        <Image
          src="/courseai2.png"
          alt={enrollment.course.title}
          fill
          className={`object-cover transition-transform duration-300 ${
            isCompleted ? 'opacity-80' : 'group-hover:scale-105'
          }`}
        />
        {isCompleted && (
          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
            <div className="bg-card rounded-full p-2.5 shadow-lg">
              <CheckCircle size={28} className="text-success" />
            </div>
          </div>
        )}
        {!isCompleted && (
          <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold text-foreground shadow-sm">
            {pct}%
          </div>
        )}
      </Link>

      <div className="flex flex-col grow p-5">
        <Link href={courseHref}>
          <h3
            className="text-lg font-semibold mb-2 line-clamp-2 hover:underline"
            style={{ color: isCompleted ? 'var(--success)' : 'var(--gradient-r)' }}
          >
            {enrollment.course.title}
          </h3>
        </Link>

        {!isCompleted && (
          <div className="mb-3 rounded-lg bg-gradient-r/10 border border-gradient-r/30 px-3 py-2 min-h-[56px] flex items-center">
            {next ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gradient-r mb-0.5">
                  Další lekce {next.index}/{next.total}
                </p>
                <p className="text-sm font-medium text-foreground line-clamp-2 break-words">
                  {next.title}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gradient-r">Připraven začít</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} />
            {total * 20} min
          </span>
          <span>
            {done}/{total} {czechPlural(total, 'modul', 'moduly', 'modulů')}
          </span>
        </div>

        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: isCompleted ? 'var(--success)' : 'var(--primary)',
            }}
          />
        </div>

        <div className="mt-auto">
          {isCompleted ? (
            <Link
              href={courseHref}
              className="w-full inline-flex items-center justify-center gap-2 text-success font-semibold py-2.5 px-4 rounded-md bg-success/10 border border-success/30 hover:bg-success/20 transition-colors"
            >
              <CheckCircle size={16} />
              <span>Kurz dokončen</span>
            </Link>
          ) : (
            <a
              href={href}
              className="w-full inline-flex items-center justify-center gap-2 text-primary-foreground font-semibold py-2.5 px-4 rounded-md hover:brightness-110 active:translate-y-px transition-all"
              style={{ backgroundColor: 'var(--gradient-r)' }}
            >
              <span>{ctaLabel}</span>
              <ArrowRight size={16} />
            </a>
          )}
          {!isCompleted && next && (
            <Link
              href={courseHref}
              className="mt-2 w-full inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-gradient-r transition-colors"
            >
              Přehled kurzu
              <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
