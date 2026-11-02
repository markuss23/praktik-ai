'use client';

import { useState } from 'react';
import { CheckCircle, ChevronDown, Circle } from 'lucide-react';
import type { AssessmentContext, AssessmentProgressItem } from '@/api';
import { formatName } from '@/lib/assessment-labels';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { AssessmentRunner, type SessionResult } from './AssessmentRunner';

interface AssessmentStepsProps {
  courseId: number;
  moduleId: number | null;
  context: AssessmentContext;
  items: AssessmentProgressItem[];
  onFinished: (result: SessionResult | null) => void;
}

/**
 * Formáty připojené k jednomu kontextu (procvičování, test modulu, závěrečný
 * test). Rozbalený je vždy nejvýš jeden — výchozí první nesplněný povinný.
 */
export function AssessmentSteps({ courseId, moduleId, context, items, onFinished }: AssessmentStepsProps) {
  const [openId, setOpenId] = useState<number | null>(() => {
    const first = items.find((i) => i.isRequired && !i.passed) ?? items.find((i) => !i.passed);
    return first?.courseAssessmentId ?? null;
  });

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const open = openId === item.courseAssessmentId;
        return (
          <div key={item.courseAssessmentId} className="rounded-lg border border-border">
            <Button
              variant="plain"
              onClick={() => setOpenId(open ? null : item.courseAssessmentId)}
              aria-expanded={open}
              className={cn(BTN_KEEP_BOX, 'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-muted/50')}
            >
              {item.passed
                ? <CheckCircle className="size-5 shrink-0 text-success" />
                : <Circle className="size-5 shrink-0 text-muted-foreground" />}
              <span className="grow min-w-0">
                <span className="block text-sm font-semibold text-foreground">{formatName(item.assessmentTypeCode)}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.isRequired ? 'Povinné' : 'Nepovinné'}
                  {item.passed && ' · splněno'}
                </span>
              </span>
              <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </Button>
            {open && (
              <div className="border-t border-border px-4 py-4">
                <AssessmentRunner
                  target={{ courseId, context, moduleId, assessmentTypeCode: item.assessmentTypeCode }}
                  startLabel={item.passed ? 'Projít znovu' : 'Spustit'}
                  onFinished={onFinished}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
