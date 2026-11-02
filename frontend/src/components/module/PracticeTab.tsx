'use client';

import { useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import type { ModuleProgressItem } from '@/api';
import { requiredPassed } from '@/lib/assessment-labels';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { AssessmentRunner } from './AssessmentRunner';
import { AssessmentSteps } from './AssessmentSteps';
import { ProgressStaleNotice } from './ProgressStaleNotice';

interface PracticeTabProps {
  courseId: number;
  moduleId: number;
  /** Průběh modulu ze serveru; null = nepodařilo se načíst. */
  moduleProgress: ModuleProgressItem | null;
  progressStale: boolean;
  onProgressChange: () => void | Promise<void>;
  onComplete: () => void;
}

/**
 * Procvičování modulu: nejdřív pretest (povinný, otázky po jedné), pak formáty,
 * které lektor připojil do kontextu practice. Hodnotí vše server.
 */
export default function PracticeTab({ courseId, moduleId, moduleProgress, progressStale, onProgressChange, onComplete }: PracticeTabProps) {
  // Pretest dokončený v tomhle zobrazení zůstane vidět i s vyhodnocením odpovědí
  const [pretestJustFinished, setPretestJustFinished] = useState(false);

  if (!moduleProgress) {
    return (
      <div className="text-center py-16">
        <p role="alert" className="text-sm text-muted-foreground mb-4">Průběh modulu se nepodařilo načíst.</p>
        <Button variant="outline" onClick={onProgressChange}>Zkusit znovu</Button>
      </div>
    );
  }

  const pretests = moduleProgress.assessments.filter((a) => a.context === 'pretest');
  const practices = moduleProgress.assessments.filter((a) => a.context === 'practice');
  const pretestDone = requiredPassed(pretests);
  // Stejná podmínka jako gate testu modulu na backendu (pretest + povinné practice)
  const readyForTest = pretestDone && requiredPassed(practices);

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Procvičování</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Odpovězte na otázky a ověřte si své znalosti z příručky.
        </p>
      </div>

      {progressStale && <ProgressStaleNotice onRetry={onProgressChange} />}

      {pretests.length > 0 && (
        <section className="mb-8">
          <h4 className="font-semibold text-foreground mb-1">Pretest</h4>
          {pretestDone && !pretestJustFinished ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle className="size-5" />
              Pretest máte splněný.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-5">
                Krátké ověření, že víte, o čem modul je: dvě otázky s výběrem a jedna otevřená.
                Na každou máte tři pokusy a splnit je potřeba všechny.
              </p>
              <AssessmentRunner
                target={{ courseId, context: 'pretest', moduleId, assessmentTypeCode: 'pretest' }}
                autoStart
                onFinished={(result) => {
                  // Pretest dokončený jinde (null) — výsledek ukáže až obnovený průběh
                  setPretestJustFinished(result !== null);
                  onProgressChange();
                }}
              />
            </>
          )}
        </section>
      )}

      {practices.length > 0 && (
        <section className="mb-8">
          <h4 className="font-semibold text-foreground mb-3">
            {pretests.length > 0 ? 'Další procvičování' : 'Procvičování'}
          </h4>
          {pretestDone ? (
            <AssessmentSteps
              courseId={courseId}
              moduleId={moduleId}
              context="practice"
              items={practices}
              onFinished={onProgressChange}
            />
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" />
              Odemkne se po splnění pretestu.
            </p>
          )}
        </section>
      )}

      {pretests.length === 0 && practices.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">Tento modul nemá procvičování.</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
        {!readyForTest && (
          <p className="text-sm text-muted-foreground mr-auto">
            Test se odemkne po splnění povinných částí procvičování.
          </p>
        )}
        <Button
          variant="plain"
          onClick={onComplete}
          disabled={!readyForTest}
          className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed")}
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Pokračovat na test
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
