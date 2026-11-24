'use client';

import {
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import { fmtScore } from '@/components/competences/ScoreDumbbell';
import { krauuAreaNumber, krauuAreaShortName, type AreaProfile } from '@/lib/krauu-stats';

interface RadarDatum {
  label: string;
  name: string;
  pretest: number | null;
  outcome: number | null;
  // Recharts potřebuje číslo; oblast bez dat se kreslí ve středu
  pretestValue: number;
  outcomeValue: number;
}

interface RadarTooltipProps {
  active?: boolean;
  payload?: { payload: RadarDatum }[];
}

function RadarTooltip({ active, payload }: RadarTooltipProps) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2.5 text-xs max-w-56">
      <p className="font-semibold text-foreground mb-1">{d.name}</p>
      {d.pretest == null && d.outcome == null ? (
        <p className="text-muted-foreground">Zatím bez výsledků</p>
      ) : (
        <p className="text-foreground tabular-nums">
          Vstup {fmtScore(d.pretest)} → výstup {fmtScore(d.outcome)}
        </p>
      )}
    </div>
  );
}

// Profil šesti oblastí KRAUU: vstup (čárkovaně) proti výstupu (plná plocha)
export function CompetenceAreaRadar({ profile }: { profile: AreaProfile[] }) {
  const data: RadarDatum[] = profile.map((p) => ({
    label: `Oblast ${krauuAreaNumber(p.area.code)}`,
    name: p.area.name,
    pretest: p.pretest,
    outcome: p.outcome,
    pretestValue: p.pretest ?? 0,
    outcomeValue: p.outcome ?? 0,
  }));
  const hasPretest = profile.some((p) => p.pretest != null);
  const hasOutcome = profile.some((p) => p.outcome != null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-center">
      <div>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
            <PolarRadiusAxis domain={[0, 100]} tickCount={3} tick={false} axisLine={false} />
            {hasPretest && (
              <Radar
                name="Vstup"
                dataKey="pretestValue"
                stroke="var(--gradient-r)"
                strokeOpacity={0.6}
                strokeDasharray="4 3"
                strokeWidth={2}
                fill="var(--gradient-r)"
                fillOpacity={0.06}
                isAnimationActive
              />
            )}
            {hasOutcome && (
              <Radar
                name="Výstup"
                dataKey="outcomeValue"
                stroke="var(--gradient-r)"
                strokeWidth={2}
                fill="var(--gradient-r)"
                fillOpacity={0.2}
                dot={{ r: 3, fill: 'var(--gradient-r)', strokeWidth: 0 }}
                isAnimationActive
              />
            )}
            <Tooltip content={<RadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-gradient-r/60" aria-hidden /> Vstup
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-gradient-r/40 border-2 border-gradient-r" aria-hidden /> Výstup
          </span>
        </div>
        {profile.some((p) => p.pretest == null || p.outcome == null) && (
          <p className="text-center text-[11px] text-muted-foreground mt-1">
            Oblast bez výsledku leží ve středu grafu, nejde o nulu.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2" aria-label="Hodnoty oblastí">
        {profile.map((p) => (
          <li key={p.area.krauuId} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-x-2 text-xs">
            <span className="text-muted-foreground tabular-nums">{krauuAreaNumber(p.area.code)}</span>
            <span className="min-w-0">
              <span className="block text-foreground truncate" title={p.area.name}>{krauuAreaShortName(p.area.name)}</span>
              <span className="block text-[11px] text-muted-foreground">
                {p.tested > 0 ? `ověřeno ${p.tested} z ${p.total}` : 'zatím neověřeno'}
              </span>
            </span>
            <span className="text-right tabular-nums font-semibold text-foreground">
              {p.tested > 0 ? `${fmtScore(p.pretest)} → ${fmtScore(p.outcome)}` : '–'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
