'use client';

import type { ModuleProgressItem } from '@/api';
import { isTypedFormat } from '@/lib/assessment-labels';
import { Button } from '@/components/ui';
import { ModuleCompletedCard } from './ModuleCompletedCard';
import { AssessmentSteps } from './AssessmentSteps';
import { ProgressStaleNotice } from './ProgressStaleNotice';

interface AssessmentTabProps {
  courseId: number;
  moduleId: number;
  moduleProgress: ModuleProgressItem | null;
  progressStale: boolean;
  courseCompleted: boolean;
  moduleNumber: number;
  moduleTitle: string;
  nextModule: { moduleId: number; title: string } | null;
  onProgressChange: () => void | Promise<void>;
  onModuleComplete: () => void;
}

export default function AssessmentTab({
  courseId,
  moduleId,
  moduleProgress,
  progressStale,
  courseCompleted,
  moduleNumber,
  moduleTitle,
  nextModule,
  onProgressChange,
  onModuleComplete,
}: AssessmentTabProps) {
  if (!moduleProgress) {
    return (
      <div className="text-center py-16">
        <p role="alert" className="text-sm text-muted-foreground mb-4">Průběh modulu se nepodařilo načíst.</p>
        <Button variant="outline" onClick={onProgressChange}>Zkusit znovu</Button>
      </div>
    );
  }

  const tests = moduleProgress.assessments.filter((a) => a.context === 'assessment');

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Test</h3>
        {tests.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Ověřte si znalosti z modulu.
            {tests.some((t) => isTypedFormat(t.assessmentTypeCode)) && ' Psané odpovědi pište vlastními slovy, vložit text nejde.'}
          </p>
        )}
      </div>

      {progressStale && <ProgressStaleNotice onRetry={onProgressChange} />}

      {tests.length > 0 ? (
        <AssessmentSteps
          courseId={courseId}
          moduleId={moduleId}
          context="assessment"
          items={tests}
          onFinished={onProgressChange}
        />
      ) : (
        <p className="text-muted-foreground py-6 text-center">Tento modul nemá test.</p>
      )}

      {moduleProgress.completed ? (
        <div className="mt-8">
          <ModuleCompletedCard
            moduleNumber={moduleNumber}
            moduleTitle={moduleTitle}
            ctaLabel={
              courseCompleted
                ? 'Zpět na kurz'
                : nextModule
                  ? 'Pokračovat na další modul'
                  : 'Dokončit kurz'
            }
            onContinue={onModuleComplete}
          />
        </div>
      ) : tests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Modul se dokončí po splnění povinných částí procvičování.
        </p>
      )}
    </div>
  );
}
