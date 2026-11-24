'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { MyCompetenceItem } from '@/api';
import type { KrauuArea } from '@/lib/course-categories';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import { Button } from '@/components/ui';
import {
  ScoreAxisLabels, ScoreDumbbellTrack, ScoreLegend, fmtDelta, fmtScore,
} from '@/components/competences/ScoreDumbbell';
import { CompetenceHistoryChart } from './CompetenceHistoryChart';

// Mřížka řádku: label | plot | hodnoty; pevná šířka label, aby osa v header seděla s řádky
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[12rem_minmax(0,1fr)_5.5rem] xl:grid-cols-[20rem_minmax(0,1fr)_5.5rem] items-center gap-x-4 gap-y-1';

// Seznam kompetencí po oblastech: vstup -> výstup, růst, po rozbalení zdroje a průběh
export function CompetenceList({ areas, items }: { areas: KrauuArea[]; items: MyCompetenceItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const groups = areas
    .map(({ area }) => ({ area, items: items.filter((i) => i.areaId === area.krauuId) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <div className={cn(ROW_GRID, 'px-2 mb-1')} aria-hidden>
        <span />
        <ScoreAxisLabels className="hidden sm:block" />
        <span className="text-[10px] text-muted-foreground text-right uppercase tracking-wider whitespace-nowrap">Vstup → výstup</span>
      </div>
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g.area.krauuId}>
            <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-0.5">
              {g.area.name}
            </h5>
            <ul className="flex flex-col">
              {g.items.map((item) => (
                <CompetenceRow
                  key={item.krauuId}
                  item={item}
                  expanded={expanded === item.krauuId}
                  onToggle={() => setExpanded((prev) => (prev === item.krauuId ? null : item.krauuId))}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ScoreLegend className="pt-3 mt-3 border-t border-border" />
    </div>
  );
}

function CompetenceRow({
  item, expanded, onToggle,
}: {
  item: MyCompetenceItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  return (
    <li>
      <Button
        variant="plain"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          BTN_KEEP_BOX,
          ROW_GRID,
          'w-full justify-stretch text-left whitespace-normal font-normal rounded-lg px-2 py-1.5 hover:bg-muted/50 aria-expanded:bg-muted/50',
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0 text-xs text-foreground">
          <ChevronDown
            className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
          <span className="text-muted-foreground tabular-nums">{item.code}</span>
          <span className="truncate" title={item.name}>{item.name}</span>
        </span>

        <ScoreDumbbellTrack
          pre={item.pretestScore}
          out={item.outcomeScore}
          className="order-last col-span-2 sm:order-none sm:col-span-1"
        />

        <span className="text-right">
          <span className="block text-xs font-semibold text-foreground tabular-nums">
            {fmtScore(item.pretestScore)} → {fmtScore(item.outcomeScore)}
          </span>
          <span className="block text-[10px] text-muted-foreground tabular-nums">
            {item.delta != null ? `růst ${fmtDelta(item.delta)}` : 'růst –'}
          </span>
        </span>
      </Button>

      {expanded && <CompetenceDetail id={panelId} item={item} />}
    </li>
  );
}

function CompetenceDetail({ id, item }: { id: string; item: MyCompetenceItem }) {
  const sourceTitle = (courseId: number, moduleId: number | null) => {
    const s = item.sources.find((src) => src.courseId === courseId && src.moduleId === moduleId);
    if (!s) return 'Kurz';
    return s.moduleTitle ? `${s.courseTitle} › ${s.moduleTitle}` : `${s.courseTitle} › Závěrečný test kurzu`;
  };

  // Detail odpovědí jen ze sessions, které ho mají (novější testy)
  const withAnswers = item.history.filter((h) => h.answers != null && h.answers > 0);
  const answers = withAnswers.reduce((n, h) => n + (h.answers ?? 0), 0);
  const graded = withAnswers.filter((h) => h.correct != null);
  const gradedAnswers = graded.reduce((n, h) => n + (h.answers ?? 0), 0);
  const correct = graded.reduce((n, h) => n + (h.correct ?? 0), 0);
  const timed = withAnswers.filter((h) => h.avgElapsedS != null);
  const timedAnswers = timed.reduce((n, h) => n + (h.answers ?? 0), 0);
  const avgSeconds = timedAnswers > 0
    ? timed.reduce((sum, h) => sum + (h.avgElapsedS ?? 0) * (h.answers ?? 0), 0) / timedAnswers
    : null;

  return (
    <div id={id} className="mx-2 mt-1 mb-2 rounded-lg bg-muted/50 p-3 text-xs flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kde jste kompetenci rozvíjeli</p>
        <ul className="flex flex-col gap-1">
          {item.sources.map((s) => (
            <li key={`${s.courseId}-${s.moduleId ?? 'final'}`} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <Link
                  href={s.moduleId != null ? `/modules/${s.moduleId}` : `/courses/${s.courseId}`}
                  className="text-foreground underline-offset-2 hover:underline hover:text-gradient-r"
                >
                  {s.moduleTitle ?? 'Závěrečný test kurzu'}
                </Link>
                <span className="text-muted-foreground"> · {s.courseTitle}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                {s.pretestScore == null && s.outcomeScore == null
                  ? <span className="text-muted-foreground">jen procvičování</span>
                  : `${fmtScore(s.pretestScore)} → ${fmtScore(s.outcomeScore)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {item.history.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Průběh v čase ({item.history.length} {czechPlural(item.history.length, 'pokus', 'pokusy', 'pokusů')})
          </p>
          <CompetenceHistoryChart history={item.history} sourceTitle={sourceTitle} />
        </div>
      )}

      <p className="text-muted-foreground">
        {answers > 0 ? (
          <>
            Odpovědi: <strong className="text-foreground tabular-nums">{answers}</strong>
            {gradedAnswers > 0 && (
              <>, správně <strong className="text-foreground tabular-nums">{Math.round((correct / gradedAnswers) * 100)} %</strong></>
            )}
            {avgSeconds != null && (
              <>, průměrně <strong className="text-foreground tabular-nums">{Math.round(avgSeconds)} s</strong> na odpověď</>
            )}
          </>
        ) : (
          'Podrobnosti o odpovědích jsou k dispozici jen u novějších testů.'
        )}
      </p>
    </div>
  );
}
