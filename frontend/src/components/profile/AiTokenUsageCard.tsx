'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Cpu } from 'lucide-react';
import { Badge, Button, SegmentedControl, SegmentedControlItem } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

// Karta spotřeby AI tokenů pro superadmina.
//
// ZATÍM UKÁZKOVÁ DATA: backend tokeny neměří. Až vznikne endpoint
// (např. GET /superadmin/ai-usage?days=30), stačí nahradit `buildSampleUsage`
// jeho odpovědí — typy níže odpovídají tvaru, který karta potřebuje.

type Period = '7d' | '30d';

export interface AiUsageDay {
  date: string; // yyyy-mm-dd
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export interface AiUsageFeature {
  key: string;
  label: string;
  tokens: number;
}

interface AiUsageSummary {
  days: AiUsageDay[];
  previousTotal: number;
  features: AiUsageFeature[];
}

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30 };

const compact = new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('cs-CZ');

// === UKÁZKOVÁ DATA ========================================================

const DAY_MS = 86_400_000;

// Klíče odpovídají skupinám SystemSetting agentů v backendu.
const SAMPLE_FEATURE_SHARES: { key: string; label: string; share: number }[] = [
  { key: 'mentor', label: 'AI mentor', share: 0.36 },
  { key: 'course_generator', label: 'Generátor kurzů', share: 0.29 },
  { key: 'evaluation', label: 'Hodnocení odpovědí', share: 0.15 },
  { key: 'question_generator', label: 'Generování otázek', share: 0.1 },
  { key: 'wiki', label: 'Nápověda (wiki)', share: 0.06 },
  { key: 'other', label: 'Ostatní', share: 0.04 },
];

/** Deterministický PRNG — stejný den dá vždy stejná čísla. */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildSampleUsage(periodDays: number): AiUsageSummary {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generujeme aktuální období + stejně dlouhé předchozí (kvůli srovnání).
  const all: AiUsageDay[] = [];
  const span = periodDays * 2;
  for (let back = span - 1; back >= 0; back--) {
    const date = new Date(today);
    date.setDate(today.getDate() - back);
    const rand = mulberry32(Math.floor(date.getTime() / DAY_MS));
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.45 : 1;
    const trend = 1 + (span - back) * 0.004;
    const tokens = Math.round(150_000 * weekend * trend * (0.7 + rand() * 0.6));
    const input = Math.round(tokens * (0.7 + rand() * 0.1));
    all.push({
      date: toIsoDate(date),
      inputTokens: input,
      outputTokens: tokens - input,
      calls: Math.max(1, Math.round(tokens / (2_100 + rand() * 600))),
    });
  }

  const days = all.slice(periodDays);
  const previousTotal = all.slice(0, periodDays).reduce((s, d) => s + d.inputTokens + d.outputTokens, 0);
  const total = days.reduce((s, d) => s + d.inputTokens + d.outputTokens, 0);
  const features = SAMPLE_FEATURE_SHARES.map(({ key, label, share }) => ({
    key,
    label,
    tokens: Math.round(total * share),
  }));

  return { days, previousTotal, features };
}

// === POMOCNÉ ==============================================================

function dayTotal(d: AiUsageDay): number {
  return d.inputTokens + d.outputTokens;
}

/** Zaokrouhlí nahoru na „hezké" číslo (1 / 2 / 2,5 / 5 × 10^n) pro osu Y. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(value));
  const n = value / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * mag;
}

function pct(part: number, whole: number): string {
  return `${whole > 0 ? Math.round((part / whole) * 100) : 0} %`;
}

function shortDate(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

// === KARTA ================================================================

export function AiTokenUsageCard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [showTable, setShowTable] = useState(false);

  const periodDays = PERIOD_DAYS[period];
  const data = useMemo(() => buildSampleUsage(periodDays), [periodDays]);

  const totals = useMemo(() => {
    const input = data.days.reduce((s, d) => s + d.inputTokens, 0);
    const output = data.days.reduce((s, d) => s + d.outputTokens, 0);
    const calls = data.days.reduce((s, d) => s + d.calls, 0);
    const total = input + output;
    const delta = data.previousTotal > 0
      ? Math.round(((total - data.previousTotal) / data.previousTotal) * 100)
      : null;
    return { input, output, calls, total, delta };
  }, [data]);

  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Cpu className="size-5 text-foreground" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">Využití AI tokenů</h3>
          <Badge variant="meta">Ukázková data</Badge>
        </div>
        <SegmentedControl
          size="sm"
          value={period}
          onValueChange={setPeriod}
          aria-label="Období"
          className="self-start sm:self-auto"
        >
          <SegmentedControlItem value="7d">7 dní</SegmentedControlItem>
          <SegmentedControlItem value="30d">30 dní</SegmentedControlItem>
        </SegmentedControl>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Tokeny celkem"
          value={compact.format(totals.total)}
          hint={
            totals.delta === null ? undefined : (
              <>
                {totals.delta >= 0
                  ? <ArrowUpRight className="inline size-3 mr-0.5 align-[-2px]" aria-hidden="true" />
                  : <ArrowDownRight className="inline size-3 mr-0.5 align-[-2px]" aria-hidden="true" />}
                {totals.delta >= 0 ? '+' : '−'}{Math.abs(totals.delta)}&nbsp;% proti předchozím {periodDays}&nbsp;dnům
              </>
            )
          }
        />
        <StatTile
          label="Vstupní tokeny"
          value={compact.format(totals.input)}
          hint={`${pct(totals.input, totals.total)} z celku`}
        />
        <StatTile
          label="Výstupní tokeny"
          value={compact.format(totals.output)}
          hint={`${pct(totals.output, totals.total)} z celku`}
        />
        <StatTile
          label="AI volání"
          value={full.format(totals.calls)}
          hint={`Ø ${full.format(totals.calls > 0 ? Math.round(totals.total / totals.calls) : 0)} tokenů / volání`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        {/* Denní spotřeba */}
        <section aria-labelledby="ai-usage-daily">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 id="ai-usage-daily" className="text-sm font-semibold text-foreground">
              Denní spotřeba tokenů
            </h4>
            <Button
              variant="plain"
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              className={cn(BTN_KEEP_BOX, 'text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-4')}
            >
              {showTable ? 'Zobrazit graf' : 'Zobrazit tabulku'}
            </Button>
          </div>
          {showTable ? <DailyTable days={data.days} /> : <DailyChart days={data.days} />}
        </section>

        {/* Podle funkce */}
        <section aria-labelledby="ai-usage-features">
          <h4 id="ai-usage-features" className="text-sm font-semibold text-foreground mb-3">
            Podle funkce
          </h4>
          <FeatureList features={data.features} total={totals.total} />
        </section>
      </div>

      <p className="mt-5 text-[11px] text-muted-foreground">
        Čísla jsou zatím ukázková — skutečné měření tokenů v backendu ještě není.
      </p>
    </div>
  );
}

// === KPI DLAŽDICE =========================================================

function StatTile({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground leading-tight mt-1">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// === DENNÍ GRAF ===========================================================

const PLOT_HEIGHT = 144;

function DailyChart({ days }: { days: AiUsageDay[] }) {
  const [active, setActive] = useState<number | null>(null);

  const max = useMemo(() => niceCeil(Math.max(0, ...days.map(dayTotal))), [days]);
  const ticks = [0, max / 2, max];
  const n = days.length;

  // 7 dní → popisek u každého dne; 30 dní → každý 7. den, počítáno od dneška.
  const labelEvery = n <= 7 ? 1 : 7;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    setActive((cur) => {
      const from = cur ?? n - 1;
      if (e.key === 'Home') return 0;
      if (e.key === 'End') return n - 1;
      return Math.min(n - 1, Math.max(0, from + (e.key === 'ArrowRight' ? 1 : -1)));
    });
  }

  const activeDay = active !== null ? days[active] : null;
  const activeRatio = active !== null ? (active + 0.5) / n : 0;

  return (
    <div className="flex gap-2">
      {/* Osa Y */}
      <div className="relative w-12 shrink-0" style={{ height: PLOT_HEIGHT }} aria-hidden="true">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-0 translate-y-1/2 text-[10px] leading-none text-muted-foreground tabular-nums"
            style={{ bottom: `${(t / max) * 100}%` }}
          >
            {compact.format(t)}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          style={{ height: PLOT_HEIGHT }}
          tabIndex={0}
          role="group"
          aria-label="Denní spotřeba tokenů. Šipkami vlevo a vpravo procházíš jednotlivé dny."
          onKeyDown={onKeyDown}
          onFocus={() => setActive((cur) => cur ?? n - 1)}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {/* Mřížka */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 h-px bg-border"
              style={{ bottom: `${(t / max) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          {/* Sloupce — celý sloupec je hit target, ne jen pruh */}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const total = dayTotal(d);
              const h = total > 0 ? Math.max(2, (total / max) * PLOT_HEIGHT) : 0;
              return (
                <div
                  key={d.date}
                  className={cn(
                    'relative flex-1 h-full flex items-end justify-center rounded-sm transition-colors',
                    active === i && 'bg-foreground/5',
                  )}
                  onPointerEnter={() => setActive(i)}
                  aria-hidden="true"
                >
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-chart-accent"
                    style={{ height: h }}
                  />
                </div>
              );
            })}
          </div>

          {/* Tooltip */}
          {activeDay && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute z-10 min-w-[160px] rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-lg"
              style={{
                left: `${activeRatio * 100}%`,
                bottom: Math.min(PLOT_HEIGHT - 8, (dayTotal(activeDay) / max) * PLOT_HEIGHT + 8),
                transform: `translateX(${activeRatio < 0.2 ? '-15%' : activeRatio > 0.8 ? '-85%' : '-50%'})`,
              }}
            >
              <div className="text-muted-foreground whitespace-nowrap">
                {parseIsoDate(activeDay.date).toLocaleDateString('cs-CZ', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="text-sm font-semibold whitespace-nowrap mt-0.5">
                {full.format(dayTotal(activeDay))} tokenů
              </div>
              <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">Vstup</dt>
                <dd className="text-right tabular-nums">{full.format(activeDay.inputTokens)}</dd>
                <dt className="text-muted-foreground">Výstup</dt>
                <dd className="text-right tabular-nums">{full.format(activeDay.outputTokens)}</dd>
                <dt className="text-muted-foreground">Volání</dt>
                <dd className="text-right tabular-nums">{full.format(activeDay.calls)}</dd>
              </dl>
            </div>
          )}
        </div>

        {/* Osa X */}
        <div className="relative h-4 mt-1.5" aria-hidden="true">
          {days.map((d, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <span
                key={d.date}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground tabular-nums"
                style={{ left: `${((i + 0.5) / n) * 100}%` }}
              >
                {shortDate(d.date)}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

function DailyTable({ days }: { days: AiUsageDay[] }) {
  return (
    <div className="max-h-[188px] overflow-y-auto rounded-md border border-border">
      <table className="w-full text-xs tabular-nums">
        <caption className="sr-only">Denní spotřeba tokenů</caption>
        <thead className="sticky top-0 bg-card text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="px-3 py-2 text-left font-medium">Datum</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Vstup</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Výstup</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Celkem</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Volání</th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {[...days].reverse().map((d) => (
            <tr key={d.date} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-3 py-1.5 text-left font-normal">{shortDate(d.date)}</th>
              <td className="px-3 py-1.5 text-right">{full.format(d.inputTokens)}</td>
              <td className="px-3 py-1.5 text-right">{full.format(d.outputTokens)}</td>
              <td className="px-3 py-1.5 text-right font-medium">{full.format(dayTotal(d))}</td>
              <td className="px-3 py-1.5 text-right">{full.format(d.calls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// === PODLE FUNKCE =========================================================

function FeatureList({ features, total }: { features: AiUsageFeature[]; total: number }) {
  // Seřazeno od největší; „Ostatní" vždy na konci.
  const sorted = [...features].sort((a, b) => {
    if (a.key === 'other') return 1;
    if (b.key === 'other') return -1;
    return b.tokens - a.tokens;
  });
  const top = Math.max(1, ...sorted.map((f) => f.tokens));

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((f) => (
        <li key={f.key}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-sm text-foreground truncate">{f.label}</span>
            <span className="shrink-0 text-xs text-foreground tabular-nums">
              {compact.format(f.tokens)}
              <span className="text-muted-foreground"> · {pct(f.tokens, total)}</span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-chart-accent/15 overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-chart-accent"
              style={{ width: `${(f.tokens / top) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
