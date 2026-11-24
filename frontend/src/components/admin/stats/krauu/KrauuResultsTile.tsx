'use client';

import { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Info, Target, TriangleAlert } from 'lucide-react';
import type { CompetenceStatsItem } from '@/api';
import type { KrauuArea } from '@/lib/course-categories';
import {
  KRAUU_MIN_USERS, krauuResultFlags, krauuTestedUsers, sortKrauuByWeakest,
} from '@/lib/krauu-stats';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import {
  Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui';
import {
  ScoreAxisLabels, ScoreDumbbellTrack, ScoreLegend, fmtDelta, fmtScore,
} from '@/components/competences/ScoreDumbbell';
import { ChartTile, EmptyChart } from '../components';

type SortMode = 'framework' | 'weakest';
export type KrauuResultsState = 'loading' | 'ready' | 'error';

// Mřížka řádku: label | plot | hodnoty; pevná šířka label, aby osa v header seděla s řádky
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[13rem_minmax(0,1fr)_6.5rem] lg:grid-cols-[20rem_minmax(0,1fr)_6.5rem] items-center gap-x-4 gap-y-1';

// Průměr vstupu a výstupu po kompetencích přes všechny uživatele (/competences/stats)
export function KrauuResultsTile({
  areas, items, state, scopeLabel, filterNote, className, delay,
}: {
  areas: KrauuArea[];
  items: CompetenceStatsItem[];
  state: KrauuResultsState;
  // Za co výsledky jsou: "všechny kurzy" nebo název kurzu
  scopeLabel: string;
  // Upozornění, když se filtr dashboardu na výsledky nevztahuje
  filterNote?: string;
  className?: string;
  delay?: number;
}) {
  const [sort, setSort] = useState<SortMode>('framework');
  const [expanded, setExpanded] = useState<number | null>(null);

  const totalCompetences = areas.reduce((n, a) => n + a.competences.length, 0);
  // Kompetence s výsledkem v některé oblasti; jen procvičování (oba průměry null) se nepočítá
  const withResults = useMemo(() => {
    const areaIds = new Set(areas.map((a) => a.area.krauuId));
    return items.filter((i) => (i.pretestAvg != null || i.outcomeAvg != null) && i.areaId != null && areaIds.has(i.areaId)).length;
  }, [areas, items]);
  const groups = useMemo(() => {
    if (sort === 'weakest') return [{ key: 'all', title: null as string | null, items: sortKrauuByWeakest(items) }];
    return areas
      .map(({ area }) => ({
        key: String(area.krauuId),
        title: area.name as string | null,
        items: items.filter((i) => i.areaId === area.krauuId),
      }))
      .filter((g) => g.items.length > 0);
  }, [areas, items, sort]);

  return (
    <ChartTile
      title="Výsledky podle kompetencí"
      subtitle={`Průměrné skóre 0-100 z dokončených testů, celé období, ${scopeLabel}`}
      icon={Target}
      className={className}
      delay={delay}
      action={items.length > 1 ? <SortToggle value={sort} onChange={setSort} /> : undefined}
    >
      {filterNote && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3">
          <Info className="size-3.5 shrink-0 mt-px" aria-hidden />
          {filterNote}
        </p>
      )}
      {state === 'loading' ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      ) : state === 'error' ? (
        <EmptyChart message="Výsledky se nepodařilo načíst" />
      ) : items.length === 0 ? (
        <EmptyChart message="Zatím žádné dokončené testy v kurzech s kompetencemi KRAUU" />
      ) : (
        <>
          <div className={cn(ROW_GRID, 'px-2 mb-1')} aria-hidden>
            <span />
            <ScoreAxisLabels className="hidden sm:block" />
            <span className="text-[10px] text-muted-foreground text-right uppercase tracking-wider whitespace-nowrap">Vstup → výstup</span>
          </div>

          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <div key={g.key}>
                {g.title && (
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-0.5">
                    {g.title}
                  </h4>
                )}
                <ul className="flex flex-col">
                  {g.items.map((item) => (
                    <KrauuResultRow
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

          <div className="flex flex-col gap-2 pt-3 border-t border-border mt-4 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              <ScoreLegend />
              {totalCompetences > withResults && (
                <span>Bez výsledků: {totalCompetences - withResults} z {totalCompetences} kompetencí</span>
              )}
            </div>
            <p className="text-center text-[11px] leading-relaxed">
              Vstup = první pretest, výstup = poslední test modulu nebo kurzu. Výsledek modulu se započítá do všech
              jeho kompetencí (modul bez vlastních přebírá kompetence kurzu), každý uživatel má stejnou váhu.
              Pod {KRAUU_MIN_USERS} uživatelů s testem je řádek jen orientační.
            </p>
          </div>
        </>
      )}
    </ChartTile>
  );
}

function KrauuResultRow({
  item, expanded, onToggle,
}: {
  item: CompetenceStatsItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  // Při málo datech se ztlumí jen graf a čísla, příznak "málo dat" musí zůstat čitelný
  const flags = krauuResultFlags(item);
  const tested = krauuTestedUsers(item);

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
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs text-foreground">
            <ChevronDown
              className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
              aria-hidden
            />
            <span className="text-muted-foreground tabular-nums">{item.code}</span>
            <span className="truncate" title={item.name}>{item.name}</span>
          </span>
          {(flags.lowData || flags.lowOutcome || flags.smallGain) && (
            <span className="flex flex-wrap gap-x-3 gap-y-0.5 pl-5 mt-0.5 text-[11px] text-muted-foreground">
              {flags.lowData && <span>málo dat (n &lt; {KRAUU_MIN_USERS})</span>}
              {flags.lowOutcome && (
                <span className="inline-flex items-center gap-1">
                  <TriangleAlert className="size-3 text-warning" aria-hidden /> nízký výstup
                </span>
              )}
              {flags.smallGain && (
                <span className="inline-flex items-center gap-1">
                  <TriangleAlert className="size-3 text-warning" aria-hidden /> malý posun
                </span>
              )}
            </span>
          )}
        </span>

        <ScoreDumbbellTrack
          pre={item.pretestAvg}
          out={item.outcomeAvg}
          className={cn('order-last col-span-2 sm:order-none sm:col-span-1', flags.lowData && 'opacity-50')}
        />

        <span className={cn('text-right', flags.lowData && 'opacity-60')}>
          <span className="block text-xs font-semibold text-foreground tabular-nums">
            {fmtScore(item.pretestAvg)} → {fmtScore(item.outcomeAvg)}
          </span>
          <span className="block text-[10px] text-muted-foreground tabular-nums">n = {tested}</span>
        </span>
      </Button>

      {expanded && (
        <div id={panelId} className="mx-2 mt-1 mb-2 rounded-lg bg-muted/50 p-3 text-xs">
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2 text-foreground">
            {item.pairedUsers > 0 && item.pairedDelta != null ? (
              <p>
                Posun u {item.pairedUsers} {czechPlural(item.pairedUsers, 'uživatele', 'uživatelů', 'uživatelů')} s oběma testy:{' '}
                <strong className="tabular-nums">{fmtDelta(item.pairedDelta)} b.</strong>
              </p>
            ) : (
              <p className="text-muted-foreground">Nikdo zatím nemá vstup i výstup, posun nelze spočítat.</p>
            )}
            {item.answerAccuracy != null && (
              <p>
                Úspěšnost odpovědí: <strong className="tabular-nums">{Math.round(item.answerAccuracy * 100)} %</strong>
              </p>
            )}
          </div>
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-7 px-0 text-[10px] text-muted-foreground uppercase tracking-wider">Zdroj</TableHead>
                <TableHead className="h-7 px-0 text-right text-[10px] text-muted-foreground uppercase tracking-wider">Vstup (n)</TableHead>
                <TableHead className="h-7 px-0 pl-3 text-right text-[10px] text-muted-foreground uppercase tracking-wider">Výstup (n)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.sources.map((s) => (
                <TableRow key={`${s.courseId}-${s.moduleId ?? 'final'}`} className="hover:bg-transparent">
                  <TableCell className="px-0 py-1.5 pr-3 whitespace-normal">
                    <span className="block text-foreground">{s.moduleTitle ?? 'Závěrečný test kurzu'}</span>
                    <span className="block text-muted-foreground">
                      {s.courseTitle}
                      {s.krauuFromCourse && s.moduleId != null && ' · kompetence převzaté z kurzu'}
                    </span>
                  </TableCell>
                  <TableCell className="px-0 py-1.5 text-right tabular-nums">
                    {fmtScore(s.pretestAvg)} <span className="text-muted-foreground">({s.pretestUsers})</span>
                  </TableCell>
                  <TableCell className="px-0 py-1.5 pl-3 text-right tabular-nums">
                    {fmtScore(s.outcomeAvg)} <span className="text-muted-foreground">({s.outcomeUsers})</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </li>
  );
}

function SortToggle({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const id = useId();
  const options: { key: SortMode; label: string }[] = [
    { key: 'framework', label: 'Podle rámce' },
    { key: 'weakest', label: 'Od nejslabších' },
  ];
  return (
    <div className="inline-flex bg-card border border-border rounded-lg p-1 shadow-sm" role="group" aria-label="Řazení kompetencí">
      {options.map((o) => (
        <Button
          variant="plain"
          key={o.key}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            BTN_KEEP_BOX,
            'relative px-3 py-1 text-xs font-medium rounded-md transition-colors',
            value === o.key ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {value === o.key && (
            <motion.span
              layoutId={`krauu-sort-${id}`}
              className="absolute inset-0 bg-gradient-r rounded-md"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </Button>
      ))}
    </div>
  );
}
