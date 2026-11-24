'use client';

import { Users } from 'lucide-react';
import type { KrauuArea } from '@/lib/course-categories';
import { krauuAreaNumber, krauuAreaShortName, type KrauuAreaEngagement } from '@/lib/krauu-stats';
import { cn } from '@/lib/utils';
import { ChartTile, EmptyChart } from '../components';

// Unikátní zapsaní a dokončivší uživatelé po oblastech KRAUU
export function KrauuEngagementTile({
  areas, engagement, className, delay,
}: {
  areas: KrauuArea[];
  engagement: Map<number, KrauuAreaEngagement>;
  className?: string;
  delay?: number;
}) {
  const rows = areas.map(({ area }) => ({
    area,
    ...(engagement.get(area.krauuId) ?? { enrolled: 0, completed: 0 }),
  }));
  const max = Math.max(0, ...rows.map((r) => r.enrolled));

  return (
    <ChartTile
      title="Zapojení podle oblastí"
      subtitle="Unikátní uživatelé v kurzech, které oblast rozvíjejí, celé období"
      icon={Users}
      className={className}
      delay={delay}
    >
      {max === 0 ? (
        <EmptyChart message="Zatím žádné zápisy v kurzech s kompetencemi KRAUU" />
      ) : (
        <>
          <ul className="flex flex-col gap-3.5">
            {rows.map((r) => {
              const inProgress = r.enrolled - r.completed;
              return (
                <li key={r.area.krauuId} title={`${r.area.name}: zapsáno ${r.enrolled}, dokončeno ${r.completed}`}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-xs text-foreground truncate">
                      <span className="text-muted-foreground tabular-nums mr-1.5">{krauuAreaNumber(r.area.code)}</span>
                      {krauuAreaShortName(r.area.name)}
                    </span>
                    <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                      zapsáno <strong className="font-semibold text-foreground">{r.enrolled}</strong>
                      {' · '}dokončeno <strong className="font-semibold text-foreground">{r.completed}</strong>
                    </span>
                  </div>
                  <div
                    className="flex h-3 gap-0.5 transition-[width] duration-500"
                    style={{ width: `${(r.enrolled / max) * 100}%` }}
                  >
                    {r.completed > 0 && (
                      <div
                        className={cn('bg-primary', inProgress === 0 && 'rounded-r-[4px]')}
                        style={{ flex: `${r.completed} 1 0` }}
                      />
                    )}
                    {inProgress > 0 && (
                      <div className="bg-tip rounded-r-[4px]" style={{ flex: `${inProgress} 1 0` }} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground pt-2 border-t border-border mt-4">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> Dokončilo</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-tip" /> Probíhá</span>
          </div>
        </>
      )}
    </ChartTile>
  );
}
