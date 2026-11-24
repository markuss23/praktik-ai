import { cn } from '@/lib/utils';

// Sdílené prvky grafu vstup -> výstup (admin statistiky i studentský profil)

export const SCORE_TICKS = [0, 25, 50, 75, 100];

export function fmtScore(v: number | null | undefined): string {
  return v == null ? '–' : String(Math.round(v));
}

export function fmtDelta(v: number): string {
  const r = Math.round(v);
  return `${r > 0 ? '+' : ''}${r}`;
}

// Popisky osy 0-100; mx-1.5 musí sedět s ScoreDumbbellTrack, aby čísla ležela nad mřížkou
export function ScoreAxisLabels({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-4 mx-1.5', className)} aria-hidden>
      {SCORE_TICKS.map((t) => (
        <span
          key={t}
          className="absolute -translate-x-1/2 text-[10px] text-muted-foreground tabular-nums"
          style={{ left: `${t}%` }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// Vstup = prázdný kroužek, výstup = plný bod, spojnice mezi nimi; hodnoty 0-100
export function ScoreDumbbellTrack({
  pre, out, className,
}: {
  pre: number | null;
  out: number | null;
  className?: string;
}) {
  const lo = pre != null && out != null ? Math.min(pre, out) : null;
  const hi = pre != null && out != null ? Math.max(pre, out) : null;
  return (
    <span className={cn('relative block h-5 mx-1.5', className)} aria-hidden>
      {SCORE_TICKS.map((t) => (
        <span key={t} className="absolute inset-y-0 w-px bg-border" style={{ left: `${t}%` }} />
      ))}
      {lo != null && hi != null && (
        <span
          className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-gradient-r/40 transition-all duration-500"
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
        />
      )}
      {pre != null && (
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-gradient-r/60 bg-card transition-all duration-500"
          style={{ left: `${pre}%` }}
        />
      )}
      {out != null && (
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-gradient-r ring-2 ring-card transition-all duration-500"
          style={{ left: `${out}%` }}
        />
      )}
    </span>
  );
}

export function ScoreLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground', className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-gradient-r/60 bg-card" /> Vstup (pretest)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-gradient-r" /> Výstup (test modulu nebo kurzu)
      </span>
    </div>
  );
}
