'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import type { AssessmentContext, SessionHistoryItem } from '@/api';
import { getAssessmentHistory } from '@/lib/api-client';
import { CONTEXT_LABELS, formatName } from '@/lib/assessment-labels';
import { cn } from '@/lib/utils';

const dateFormat = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface SessionHistoryListProps {
  courseId: number;
  moduleId: number;
  contexts: AssessmentContext[];
}

/**
 * Pokusy studenta v modulu — jen souhrn (stav, skóre, čas). Backend historie
 * neposílá znění otázek, odpovědi ani zpětnou vazbu.
 */
export function SessionHistoryList({ courseId, moduleId, contexts }: SessionHistoryListProps) {
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const contextsKey = contexts.join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getAssessmentHistory(courseId)
      .then((data) => {
        if (cancelled) return;
        const wanted = new Set(contextsKey.split(','));
        // Historie je nejnovější první — pro čtení po sobě obrátíme na chronologické pořadí
        setItems(data.filter((s) => s.moduleId === moduleId && wanted.has(s.context)).reverse());
      })
      .catch((err) => {
        console.error('Failed to load assessment history:', err);
        if (!cancelled) setError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, moduleId, contextsKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-gradient-r" />
      </div>
    );
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">Záznam pokusů se nepodařilo načíst.</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">K této části modulu nejsou uložené žádné pokusy.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((s) => {
        const done = s.status === 'passed' || s.status === 'failed';
        const passed = s.status === 'passed';
        return (
          <li
            key={s.sessionId}
            className={cn(
              'p-4 rounded-lg border',
              !done ? 'border-border' : passed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30',
            )}
          >
            <div className="flex items-start gap-2">
              {!done
                ? <Clock className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                : passed
                  ? <CheckCircle className="size-5 text-success shrink-0 mt-0.5" />
                  : <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {s.context === 'pretest' ? CONTEXT_LABELS.pretest : formatName(s.assessmentTypeCode)}
                </p>
                <p className={cn('text-sm mt-0.5', !done ? 'text-muted-foreground' : passed ? 'text-success' : 'text-destructive')}>
                  {!done ? 'Rozpracováno' : passed ? 'Splněno' : 'Nesplněno'}
                  {s.score !== null && ` · ${Math.round(s.score)} %`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateFormat.format(s.finishedAt ?? s.startedAt)}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
