'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { getModuleAssessment } from '@/lib/api-client';
import type { ModuleAssessmentQuestion } from '@/api';
import { Button } from '@/components/ui';
import { readApiErrorStatus } from '@/lib/api-error';
import { cn } from '@/lib/utils';

interface AssessmentReviewProps {
  moduleId: number;
  ctaLabel: string;
  onContinue: () => void;
}

/**
 * Test v dokončeném kurzu — jen pro čtení. Na rozdíl od AssessmentTab nikdy
 * negeneruje nový test, jen ukáže uložené zadání a pokusy (skóre + zpětná vazba).
 */
export default function AssessmentReview({ moduleId, ctaLabel, onContinue }: AssessmentReviewProps) {
  const [assessment, setAssessment] = useState<ModuleAssessmentQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAssessment(null);
    getModuleAssessment(moduleId)
      .then((data) => { if (!cancelled) setAssessment(data); })
      .catch((err) => {
        // 404 = k modulu není uložený test — není co ukázat, ale není to chyba.
        if (readApiErrorStatus(err) === 404) return;
        console.error('Failed to load assessment:', err);
        if (!cancelled) setError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moduleId]);

  const attempts = assessment?.attempts ?? [];

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Test</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Zadání a vyhodnocení vašeho testu. Kurz je dokončený, test už nejde opakovat.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-gradient-r" />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">Záznam testu se nepodařilo načíst.</p>
      ) : !assessment ? (
        <p className="text-sm text-muted-foreground">K tomuto modulu není uložený žádný test.</p>
      ) : (
        <>
          <p className="text-foreground font-medium leading-relaxed mb-6">{assessment.generatedTask}</p>

          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">K testu nejsou uložené žádné pokusy.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {attempts.map((a, idx) => (
                <li
                  key={a.attemptId}
                  className={cn(
                    'p-4 rounded-lg border',
                    a.isPassed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {a.isPassed
                      ? <CheckCircle className="size-5 text-success shrink-0 mt-0.5" />
                      : <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold', a.isPassed ? 'text-success' : 'text-destructive')}>
                        {attempts.length > 1 && `${idx + 1}. pokus · `}
                        Skóre: {a.aiScore}/100 · {a.isPassed ? 'Splněno' : 'Nesplněno'}
                      </p>
                      {a.aiFeedback && (
                        <p className="text-sm text-muted-foreground mt-1 break-words">{a.aiFeedback}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <Button size="lg" onClick={onContinue}>
          {ctaLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
