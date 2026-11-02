'use client';

import type { ModuleProgressItem } from '@/api';
import { Button } from '@/components/ui';
import { ModuleCompletedCard } from './ModuleCompletedCard';
import { AssessmentSteps } from './AssessmentSteps';

interface AssessmentTabProps {
  courseId: number;
  moduleId: number;
  /** Průběh modulu ze serveru; null = nepodařilo se načíst. */
  moduleProgress: ModuleProgressItem | null;
  courseCompleted: boolean;
  /** 1-based pořadí modulu v kurzu — pro nadpis „Modul N dokončen!". */
  moduleNumber: number;
  /** Název aktuálního modulu — zobrazuje se v textu o dokončení. */
  moduleTitle: string;
  nextModule: { moduleId: number; title: string } | null;
  /** Po dokončení session — stránka znovu načte průběh. */
  onProgressChange: () => void;
  onModuleComplete: () => void;
}

/**
 * Test modulu — formáty v kontextu assessment. Modul je hotový, když má
 * student splněné všechny povinné testy modulu; to počítá backend.
 */
export default function AssessmentTab({
  courseId,
  moduleId,
  moduleProgress,
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
            Ověřte si znalosti z modulu. Odpovědi v testu se píší vlastními slovy.
          </p>
        )}
      </div>

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
