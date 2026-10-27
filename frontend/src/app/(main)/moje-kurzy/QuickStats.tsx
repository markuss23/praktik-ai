'use client';

import { useMemo } from 'react';
import { Target, TrendingUp, Trophy, Zap } from 'lucide-react';
import type { MyEnrollmentExtended } from '@/lib/api-client';

interface QuickStatsProps {
  enrollments: MyEnrollmentExtended[];
}

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accentColor: string;
}

export function QuickStats({ enrollments }: QuickStatsProps) {
  const stats = useMemo<StatItem[]>(() => {
    const inProgress = enrollments.filter((e) => !e.completedAt);
    const completed = enrollments.filter((e) => !!e.completedAt);

    // Closest course to completion (most progress, not done)
    let closest: { title: string; remaining: number } | null = null;
    let mostActive: { title: string; pct: number } | null = null;

    for (const e of inProgress) {
      const total = e.totalModules ?? 0;
      const done = e.completedModules ?? 0;
      const remaining = total - done;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      if (remaining > 0 && (!closest || remaining < closest.remaining)) {
        closest = { title: e.course.title, remaining };
      }
      if (pct > 0 && (!mostActive || pct > mostActive.pct)) {
        mostActive = { title: e.course.title, pct };
      }
    }

    const totalModulesAll = enrollments.reduce((s, e) => s + (e.totalModules ?? 0), 0);
    const doneModulesAll = enrollments.reduce((s, e) => s + (e.completedModules ?? 0), 0);
    const overallPct = totalModulesAll > 0 ? Math.round((doneModulesAll / totalModulesAll) * 100) : 0;

    return [
      {
        icon: <Target size={20} />,
        label: 'Do dokončení nejbližšího kurzu',
        value: closest ? `${closest.remaining} ${closest.remaining === 1 ? 'modul' : closest.remaining >= 2 && closest.remaining <= 4 ? 'moduly' : 'modulů'}` : '—',
        hint: closest?.title ?? 'Žádný rozpracovaný kurz',
        accentColor: 'var(--gradient-r)',
      },
      {
        icon: <TrendingUp size={20} />,
        label: 'Nejvíc rozpracovaný',
        value: mostActive ? `${mostActive.pct}%` : '—',
        hint: mostActive?.title ?? 'Začni nějaký kurz',
        accentColor: 'var(--tip)',
      },
      {
        icon: <Trophy size={20} />,
        label: 'Dokončené kurzy',
        value: String(completed.length),
        hint: `z ${enrollments.length} zapsaných`,
        accentColor: 'var(--primary)',
      },
      {
        icon: <Zap size={20} />,
        label: 'Celkový pokrok',
        value: `${overallPct}%`,
        hint: `${doneModulesAll}/${totalModulesAll} modulů`,
        accentColor: 'var(--warning)',
      },
    ];
  }, [enrollments]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5 flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <div
              className="size-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${stat.accentColor}15`, color: stat.accentColor }}
            >
              {stat.icon}
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground leading-none">{stat.value}</div>
          <div className="text-xs sm:text-sm font-medium text-foreground mt-2">{stat.label}</div>
          {stat.hint && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1" title={stat.hint}>
              {stat.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
