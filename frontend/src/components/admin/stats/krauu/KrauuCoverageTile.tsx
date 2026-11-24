'use client';

import { Layers, TriangleAlert } from 'lucide-react';
import type { KrauuArea } from '@/lib/course-categories';
import type { KrauuCoverage } from '@/lib/krauu-stats';
import { czechPlural } from '@/lib/utils';
import { ChartTile } from '../components';

// Kolik modulů rozvíjí každou kompetenci; nula = mezera v nabídce
export function KrauuCoverageTile({
  areas, coverage, className, delay,
}: {
  areas: KrauuArea[];
  coverage: Map<number, KrauuCoverage>;
  className?: string;
  delay?: number;
}) {
  const competences = areas.flatMap((a) => a.competences);
  const moduleCount = (id: number) => coverage.get(id)?.modules ?? 0;
  const covered = competences.filter((c) => moduleCount(c.krauuId) > 0).length;
  const max = Math.max(1, ...competences.map((c) => moduleCount(c.krauuId)));

  return (
    <ChartTile
      title="Pokrytí rámce"
      subtitle={`Moduly rozvíjejí ${covered} z ${competences.length} kompetencí`}
      icon={Layers}
      className={className}
      delay={delay}
    >
      <div className="flex flex-col gap-4">
        {areas.map(({ area, competences: items }) => (
          <div key={area.krauuId}>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {area.name}
            </h4>
            <ul className="flex flex-col gap-1.5">
              {items.map((c) => {
                const modules = moduleCount(c.krauuId);
                const courses = coverage.get(c.krauuId)?.courses ?? 0;
                return (
                  <li
                    key={c.krauuId}
                    title={`${c.code} ${c.name}: ${modules} ${czechPlural(modules, 'modul', 'moduly', 'modulů')}, ${courses} ${czechPlural(courses, 'kurz', 'kurzy', 'kurzů')}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(3rem,8rem)_5.5rem] items-center gap-x-3 gap-y-1"
                  >
                    <span className="text-xs text-foreground truncate">
                      <span className="text-muted-foreground tabular-nums mr-1.5">{c.code}</span>
                      {c.name}
                    </span>
                    <div className="order-last col-span-2 sm:order-none sm:col-span-1 h-2">
                      {modules > 0 && (
                        <div
                          className="h-full rounded-r-[4px] bg-gradient-r transition-[width] duration-500"
                          style={{ width: `${(modules / max) * 100}%` }}
                        />
                      )}
                    </div>
                    {modules > 0 ? (
                      <span className="text-xs text-right tabular-nums">
                        <strong className="font-semibold text-foreground">{modules}</strong>{' '}
                        <span className="text-muted-foreground">{czechPlural(modules, 'modul', 'moduly', 'modulů')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <TriangleAlert className="size-3 text-warning" aria-hidden />
                        Bez obsahu
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </ChartTile>
  );
}
