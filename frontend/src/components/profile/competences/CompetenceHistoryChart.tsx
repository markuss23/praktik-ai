'use client';

import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { MyCompetenceHistoryItem } from '@/api';
import { fmtScore } from '@/components/competences/ScoreDumbbell';
import { czechPlural } from '@/lib/utils';

type Kind = 'pretest' | 'practice' | 'outcome';

interface Point {
  t: number;
  score: number;
  kind: Kind;
  context: string;
  source: string;
  answers: number | null;
  correct: number | null;
}

// Neutrální názvy: do vstupu se počítá jen první pretest, do výstupu jen poslední test
const KIND_LABEL: Record<Kind, string> = {
  pretest: 'Pretest',
  practice: 'Procvičování',
  outcome: 'Test modulu nebo kurzu',
};

const CONTEXT_LABEL: Record<string, string> = {
  pretest: 'Pretest',
  practice: 'Procvičování',
  assessment: 'Test modulu',
  course_final: 'Závěrečný test kurzu',
};

const DAY_MS = 86_400_000;
const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function kindOf(context: string): Kind {
  if (context === 'pretest') return 'pretest';
  if (context === 'practice') return 'practice';
  return 'outcome';
}

// Tvary bodů: vstup prázdný kroužek, procvičování malý šedý, výstup plný bod
interface ShapeProps { cx?: number; cy?: number }
const PretestShape = ({ cx = 0, cy = 0 }: ShapeProps) => (
  <circle cx={cx} cy={cy} r={5} fill="var(--card)" stroke="var(--gradient-r)" strokeOpacity={0.6} strokeWidth={2} />
);
const PracticeShape = ({ cx = 0, cy = 0 }: ShapeProps) => (
  <circle cx={cx} cy={cy} r={3.5} fill="var(--muted-foreground)" fillOpacity={0.7} />
);
const OutcomeShape = ({ cx = 0, cy = 0 }: ShapeProps) => (
  <circle cx={cx} cy={cy} r={5} fill="var(--gradient-r)" stroke="var(--card)" strokeWidth={2} />
);

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2.5 text-xs max-w-60">
      <p className="font-semibold text-foreground">
        {CONTEXT_LABEL[p.context] ?? KIND_LABEL[p.kind]}: {fmtScore(p.score)}
      </p>
      <p className="text-muted-foreground">{dateTimeFmt.format(p.t)}</p>
      <p className="text-foreground mt-1">{p.source}</p>
      {p.answers != null && (
        <p className="text-muted-foreground">
          {p.answers} {czechPlural(p.answers, 'odpověď', 'odpovědi', 'odpovědí')}
          {p.correct != null && `, správně ${p.correct}`}
        </p>
      )}
    </div>
  );
}

// Všechny dokončené pokusy dané kompetence v čase (i procvičování a opakování)
export function CompetenceHistoryChart({
  history, sourceTitle,
}: {
  history: MyCompetenceHistoryItem[];
  // Název zdroje podle kurzu a modulu pokusu
  sourceTitle: (courseId: number, moduleId: number | null) => string;
}) {
  const points: Point[] = history.map((h) => ({
    t: new Date(h.finishedAt).getTime(),
    score: h.score,
    kind: kindOf(h.context),
    context: h.context,
    source: sourceTitle(h.courseId, h.moduleId),
    answers: h.answers,
    correct: h.correct,
  }));
  const byKind = (k: Kind) => points.filter((p) => p.kind === k);
  const kinds = (['pretest', 'practice', 'outcome'] as Kind[]).filter((k) => byKind(k).length > 0);

  // Ticks osy X ručně: recharts u čísla s časem jinak dá jen jeden; stejné datum se nevypíše dvakrát
  const times = points.map((p) => p.t);
  const minT = Math.min(...times) - DAY_MS / 2;
  const maxT = Math.max(...times) + DAY_MS / 2;
  const seen = new Set<string>();
  const ticks = [0, 1, 2, 3]
    .map((i) => minT + ((maxT - minT) * i) / 3)
    .filter((t) => {
      const label = dateFmt.format(t);
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });

  return (
    <div>
      <ResponsiveContainer width="100%" height={170}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            type="number"
            dataKey="t"
            domain={[minT, maxT]}
            ticks={ticks}
            tickFormatter={(v: number) => dateFmt.format(v)}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            stroke="var(--border)"
          />
          <YAxis
            type="number"
            dataKey="score"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            stroke="var(--border)"
          />
          <Tooltip content={<HistoryTooltip />} cursor={{ stroke: 'var(--border)' }} />
          {kinds.includes('practice') && <Scatter name={KIND_LABEL.practice} data={byKind('practice')} shape={<PracticeShape />} />}
          {kinds.includes('pretest') && <Scatter name={KIND_LABEL.pretest} data={byKind('pretest')} shape={<PretestShape />} />}
          {kinds.includes('outcome') && <Scatter name={KIND_LABEL.outcome} data={byKind('outcome')} shape={<OutcomeShape />} />}
        </ScatterChart>
      </ResponsiveContainer>
      {kinds.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground mt-1">
          {kinds.includes('pretest') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-2 border-gradient-r/60 bg-card" /> {KIND_LABEL.pretest}
            </span>
          )}
          {kinds.includes('practice') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/70" /> {KIND_LABEL.practice}
            </span>
          )}
          {kinds.includes('outcome') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-gradient-r" /> {KIND_LABEL.outcome}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
