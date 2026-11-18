'use client';

import { useState } from 'react';
import type { CourseAssessmentConfig } from '@/lib/api-client';
import { isAiFormat } from '@/lib/assessment-labels';
import { AiFormatPlaceholder } from './AiFormatPlaceholder';
import { AssessmentStepList } from './AssessmentSteps';
import { LocalQuestionRunner } from './LocalQuestionRunner';

// Výchozí hodnoty ClosedQuestionsSettings na backendu
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_PASS_THRESHOLD = 0.75;

interface PreviewAssessmentStepsProps {
  configs: CourseAssessmentConfig[];
}

/**
 * Formáty jednoho kontextu v náhledu pro autora. Uzavřené otázky lektora jdou
 * projít (hodnotí se lokálně), u AI formátů se jen popíše, co student dostane —
 * otázky vzniknou až při spuštění a náhled AI nevolá.
 */
export function PreviewAssessmentSteps({ configs }: PreviewAssessmentStepsProps) {
  const [passedIds, setPassedIds] = useState<Set<number>>(() => new Set());
  const items = configs.map((config) => ({ ...config, passed: passedIds.has(config.courseAssessmentId) }));

  const markResult = (id: number, passed: boolean) => {
    setPassedIds((prev) => {
      const next = new Set(prev);
      if (passed) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <AssessmentStepList
      items={items}
      renderContent={(config) => {
        if (config.assessmentTypeCode === 'closed_questions') {
          const questions = config.settings?.questions ?? [];
          if (questions.length === 0) {
            return <p className="text-sm text-muted-foreground">Test zatím nemá žádné otázky.</p>;
          }
          return (
            <LocalQuestionRunner
              questions={questions}
              maxAttempts={config.settings?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS}
              passThreshold={config.settings?.passThreshold ?? DEFAULT_PASS_THRESHOLD}
              onFinished={(passed) => markResult(config.courseAssessmentId, passed)}
            />
          );
        }
        if (isAiFormat(config.assessmentTypeCode)) {
          return (
            <AiFormatPlaceholder
              code={config.assessmentTypeCode}
              settings={config.settings}
              courseLevel={config.context === 'course_final'}
              note="V náhledu se AI nevolá — otázky uvidí až student."
            />
          );
        }
        return <p className="text-sm text-muted-foreground">Tento formát náhled zatím neumí zobrazit.</p>;
      }}
    />
  );
}
