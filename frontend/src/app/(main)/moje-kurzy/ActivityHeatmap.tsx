'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react';
import { getMyActivity, type ActivityDay, type ActivityResponse } from '@/lib/api-client';

type ViewMode = 'year' | 'month';

interface DayCell {
  date: Date;
  iso: string; // yyyy-mm-dd
  count: number;
  titles: string[];
  inRange: boolean; // false pro padding cells mimo měsíc / mimo rok
}

const MONTH_LABELS_SHORT = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
const MONTH_LABELS_LONG = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];
const DAY_LABELS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const DAY_LABELS_FULL = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

const START_YEAR = 2026;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function intensityColor(count: number, dimmed = false): string {
  if (dimmed) {
    if (count === 0) return '#F8F9FA';
    return '#E5E7EB';
  }
  if (count === 0) return '#EAECF0';
  if (count === 1) return '#C7B8E6';
  if (count === 2) return '#8B5BA8';
  if (count <= 4) return '#6366F1';
  return '#4F46E5';
}

// === STATS COMPUTATION =====================================================

interface Stats {
  activeDays: number;
  totalEvents: number;
  currentStreak: number;
  longestStreak: number;
  topDayOfWeek: { label: string; count: number } | null;
}

function computeStats(days: ActivityDay[]): Stats {
  const byDate = new Map<string, number>();
  let totalEvents = 0;
  let activeDays = 0;
  for (const d of days) {
    byDate.set(d.date, d.count);
    if (d.count > 0) {
      activeDays += 1;
      totalEvents += d.count;
    }
  }

  // Streaks: počítáno přes celý vrácený rozsah (od fromDate po toDate),
  // ne jen přes dny, které vrátil backend (backend vrací jen dny s aktivitou).
  if (days.length === 0) {
    return { activeDays: 0, totalEvents: 0, currentStreak: 0, longestStreak: 0, topDayOfWeek: null };
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(sorted[0].date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let longest = 0;
  let running = 0;
  let currentStreak = 0;

  const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun

  const cursor = new Date(firstDate);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= today.getTime()) {
    const iso = toIsoDate(cursor);
    const count = byDate.get(iso) ?? 0;
    if (count > 0) {
      running += 1;
      const dow = (cursor.getDay() + 6) % 7; // Mon=0
      dayCounts[dow] += count;
    } else {
      if (running > longest) longest = running;
      running = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (running > longest) longest = running;

  // current streak — počítáme zpětně od dneška dokud trefíme den bez aktivity.
  // Tolerujeme, že dnešek může být prázdný (typicky uživatel zatím nezahájil).
  const back = new Date(today);
  let probedToday = false;
  while (true) {
    const iso = toIsoDate(back);
    const count = byDate.get(iso) ?? 0;
    if (count > 0) {
      currentStreak += 1;
    } else if (!probedToday) {
      // First miss = today. Allow stepping back once.
      probedToday = true;
    } else {
      break;
    }
    back.setDate(back.getDate() - 1);
    if (back < firstDate) break;
  }

  let topIdx = -1;
  let topVal = -1;
  dayCounts.forEach((v, i) => {
    if (v > topVal) {
      topVal = v;
      topIdx = i;
    }
  });
  const topDayOfWeek = topIdx >= 0 && topVal > 0
    ? { label: DAY_LABELS_FULL[topIdx], count: topVal }
    : null;

  return { activeDays, totalEvents, currentStreak, longestStreak: longest, topDayOfWeek };
}

// === GRID BUILDERS =========================================================

function buildYearGrid(
  fromDate: Date,
  toDate: Date,
  byDate: Map<string, ActivityDay>,
  highlightRange?: { from: Date; to: Date },
): { grid: DayCell[][]; monthMarkers: { col: number; label: string }[] } {
  // Posuneme se na pondělí týdne, kterému patří fromDate.
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const startDow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startDow);

  // Konec: neděle týdne, kterému patří toDate.
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);
  const endDow = (end.getDay() + 6) % 7;
  end.setDate(end.getDate() + (6 - endDow));

  const cells: DayCell[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const iso = toIsoDate(cursor);
    const found = byDate.get(iso);
    const inRange = cursor >= fromDate && cursor <= toDate;
    const inHighlight = !highlightRange
      ? true
      : cursor >= highlightRange.from && cursor <= highlightRange.to;
    cells.push({
      date: new Date(cursor),
      iso,
      count: found?.count ?? 0,
      titles: found?.titles ?? [],
      inRange: inRange && inHighlight,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = cells.length / 7;
  const columns: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  const markers: { col: number; label: string }[] = [];
  let lastMonth = -1;
  columns.forEach((col, idx) => {
    const firstDay = col[0];
    if (!firstDay) return;
    const m = firstDay.date.getMonth();
    if (m !== lastMonth) {
      markers.push({ col: idx, label: MONTH_LABELS_SHORT[m] });
      lastMonth = m;
    }
  });

  return { grid: columns, monthMarkers: markers };
}

function buildMonthGrid(
  year: number,
  month: number, // 0..11
  byDate: Map<string, ActivityDay>,
): DayCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - startDow);

  const endDow = (lastOfMonth.getDay() + 6) % 7;
  const end = new Date(lastOfMonth);
  end.setDate(lastOfMonth.getDate() + (6 - endDow));

  const cells: DayCell[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const iso = toIsoDate(cursor);
    const found = byDate.get(iso);
    cells.push({
      date: new Date(cursor),
      iso,
      count: found?.count ?? 0,
      titles: found?.titles ?? [],
      inRange: cursor.getMonth() === month && cursor.getFullYear() === year,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = Math.ceil(cells.length / 7);
  const rows: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    rows.push(cells.slice(w * 7, w * 7 + 7));
  }
  return rows;
}

//  MAIN COMPONENT 

export function ActivityHeatmap() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  // Pokud by někdo otevřel app před START_YEAR, držíme se START_YEAR.
  const latestYear = Math.max(currentYear, START_YEAR);

  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [selectedYear, setSelectedYear] = useState(latestYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState<{ cell: DayCell; x: number; y: number } | null>(null);

  // Vyber rozsah, který chceme načíst z backendu, podle viewMode + selekce.
  const range = useMemo(() => {
    if (viewMode === 'month') {
      const first = new Date(selectedYear, selectedMonth, 1);
      const last = new Date(selectedYear, selectedMonth + 1, 0);
      return { fromDate: toIsoDate(first), toDate: toIsoDate(last) };
    }
    // year — vždy celý rok, abychom mohli renderovat 52-53 týdnů
    const first = new Date(selectedYear, 0, 1);
    const last = new Date(selectedYear, 11, 31);
    return { fromDate: toIsoDate(first), toDate: toIsoDate(last) };
  }, [viewMode, selectedYear, selectedMonth]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    getMyActivity(range)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  const byDate = useMemo(() => {
    const map = new Map<string, ActivityDay>();
    for (const d of data?.days ?? []) {
      map.set(d.date, d);
    }
    return map;
  }, [data]);

  const stats = useMemo(() => computeStats(data?.days ?? []), [data]);

  const yearGrid = useMemo(() => {
    const fromDate = new Date(selectedYear, 0, 1);
    const toDate = new Date(selectedYear, 11, 31);
    return buildYearGrid(fromDate, toDate, byDate);
  }, [selectedYear, byDate]);

  const monthGrid = useMemo(
    () => buildMonthGrid(selectedYear, selectedMonth, byDate),
    [selectedYear, selectedMonth, byDate],
  );

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = START_YEAR; y <= latestYear; y++) arr.push(y);
    return arr;
  }, [latestYear]);

  function shiftMonth(delta: number) {
    let m = selectedMonth + delta;
    let y = selectedYear;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    // Neprolézáme za hranice povoleného rozsahu
    if (y < START_YEAR) return;
    if (y > currentYear || (y === currentYear && m > currentMonth)) return;
    setSelectedYear(y);
    setSelectedMonth(m);
  }

  function showTooltip(cell: DayCell, e: React.MouseEvent<HTMLElement>) {
    const target = e.currentTarget;
    const wrapper = target.closest('[data-heatmap-tooltip-root]') as HTMLElement | null;
    if (!wrapper) return;
    const r = target.getBoundingClientRect();
    const p = wrapper.getBoundingClientRect();
    setHover({ cell, x: r.left - p.left + r.width / 2, y: r.top - p.top - 4 });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">Tvoje aktivita</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year tabs */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {yearOptions.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                  selectedYear === y
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('year')}
              className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'year' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rok
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'month' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Měsíc
            </button>
          </div>
        </div>
      </div>

      {/* Month picker — only in month mode */}
      {viewMode === 'month' && (
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            aria-label="Předchozí měsíc"
          >
            <ChevronLeft size={14} />
          </button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-9 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            {MONTH_LABELS_LONG.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">{selectedYear}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            aria-label="Další měsíc"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="relative" data-heatmap-tooltip-root>
        {loading ? (
          <div className="h-40 bg-gray-50 rounded-md animate-pulse" />
        ) : error ? (
          <div className="h-40 flex items-center justify-center text-sm text-red-500">
            Nepodařilo se načíst aktivitu
          </div>
        ) : viewMode === 'year' ? (
          <YearGrid
            grid={yearGrid.grid}
            monthMarkers={yearGrid.monthMarkers}
            onHover={showTooltip}
            onLeave={() => setHover(null)}
          />
        ) : (
          <MonthGrid
            rows={monthGrid}
            onHover={showTooltip}
            onLeave={() => setHover(null)}
          />
        )}

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg max-w-[280px]"
            style={{ left: hover.x, top: hover.y, transform: 'translate(-50%, -100%)' }}
          >
            <div className="font-semibold whitespace-nowrap">
              {hover.cell.date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {hover.cell.count === 0 ? (
              <div className="text-gray-300">Žádná aktivita</div>
            ) : (
              <>
                {hover.cell.titles.map((t, idx) => (
                  <div key={idx} className="text-gray-200">
                    {t}
                  </div>
                ))}
                {hover.cell.count > hover.cell.titles.length && (
                  <div className="text-gray-400 italic">
                    +{hover.cell.count - hover.cell.titles.length} dalších
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats grid */}
      {!loading && !error && (
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            icon={<Flame size={16} className="text-orange-500" />}
            label="Aktuální série"
            value={`${stats.currentStreak} ${czechDayWord(stats.currentStreak)}`}
            tone="orange"
          />
          <StatTile
            icon={<Trophy size={16} className="text-purple-600" />}
            label="Nejdelší série"
            value={`${stats.longestStreak} ${czechDayWord(stats.longestStreak)}`}
            tone="purple"
          />
          <StatTile
            icon={<Calendar size={16} className="text-indigo-500" />}
            label="Aktivních dnů"
            value={`${stats.activeDays}`}
            hint={`${stats.totalEvents} ${czechEventWord(stats.totalEvents)}`}
            tone="indigo"
          />
          <StatTile
            icon={<TrendIcon />}
            label="Nejčastější den"
            value={stats.topDayOfWeek?.label ?? '—'}
            hint={stats.topDayOfWeek ? `${stats.topDayOfWeek.count} ${czechEventWord(stats.topDayOfWeek.count)}` : 'Zatím žádná data'}
            tone="emerald"
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-[10px] text-gray-500 justify-end">
        <span>Méně</span>
        {[0, 1, 2, 3, 5].map((n) => (
          <span key={n} className="w-3 h-3 rounded-sm" style={{ backgroundColor: intensityColor(n) }} />
        ))}
        <span>Více</span>
      </div>
    </div>
  );
}

// === SUB-COMPONENTS =========================================================

function YearGrid({
  grid,
  monthMarkers,
  onHover,
  onLeave,
}: {
  grid: DayCell[][];
  monthMarkers: { col: number; label: string }[];
  onHover: (cell: DayCell, e: React.MouseEvent<HTMLElement>) => void;
  onLeave: () => void;
}) {
  const weeks = grid.length;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <div className="flex flex-col gap-[3px] pt-[18px] flex-shrink-0">
        {DAY_LABELS_SHORT.map((lbl, i) => (
          <div key={i} className={`h-3 text-[10px] leading-3 w-5 ${i % 2 === 0 ? 'text-gray-400' : 'text-transparent'}`}>
            {i % 2 === 0 ? lbl : ''}
          </div>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative h-4 mb-1" style={{ width: `${weeks * 15}px` }}>
          {monthMarkers.map((m) => (
            <span
              key={`${m.col}-${m.label}`}
              className="absolute text-[10px] text-gray-500 font-medium"
              style={{ left: `${m.col * 15}px`, top: 0 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]" style={{ width: `${weeks * 15}px` }}>
          {grid.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <button
                  key={cell.iso}
                  type="button"
                  className="w-3 h-3 rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-purple-300 cursor-default"
                  style={{ backgroundColor: intensityColor(cell.count, !cell.inRange) }}
                  onMouseEnter={(e) => onHover(cell, e)}
                  onMouseLeave={onLeave}
                  aria-label={`${cell.iso}: ${cell.count} událostí`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  rows,
  onHover,
  onLeave,
}: {
  rows: DayCell[][];
  onHover: (cell: DayCell, e: React.MouseEvent<HTMLElement>) => void;
  onLeave: () => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAY_LABELS_SHORT.map((d) => (
          <div key={d} className="text-[11px] text-center text-gray-500 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {rows.flat().map((cell) => (
          <button
            key={cell.iso}
            type="button"
            className={`relative aspect-square rounded-md flex items-start justify-end p-1 text-[10px] font-medium transition-transform hover:scale-105 ${
              cell.inRange ? 'text-gray-700' : 'text-gray-300'
            }`}
            style={{
              backgroundColor: intensityColor(cell.count, !cell.inRange),
            }}
            onMouseEnter={(e) => onHover(cell, e)}
            onMouseLeave={onLeave}
            aria-label={`${cell.iso}: ${cell.count} událostí`}
          >
            <span>{cell.date.getDate()}</span>
            {cell.count > 0 && (
              <span
                className={`absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full ${
                  cell.count >= 3 ? 'bg-white' : 'bg-purple-800'
                }`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: 'orange' | 'purple' | 'indigo' | 'emerald';
}) {
  const borderClass = {
    orange: 'border-orange-100 bg-orange-50/40',
    purple: 'border-purple-100 bg-purple-50/40',
    indigo: 'border-indigo-100 bg-indigo-50/40',
    emerald: 'border-emerald-100 bg-emerald-50/40',
  }[tone];

  return (
    <div className={`rounded-lg border ${borderClass} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-bold text-gray-900 leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 7-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 8h6v6" />
    </svg>
  );
}

function czechDayWord(n: number): string {
  if (n === 1) return 'den';
  if (n >= 2 && n <= 4) return 'dny';
  return 'dnů';
}

function czechEventWord(n: number): string {
  if (n === 1) return 'událost';
  if (n >= 2 && n <= 4) return 'události';
  return 'událostí';
}
