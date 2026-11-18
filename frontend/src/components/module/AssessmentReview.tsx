'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { SessionHistoryList } from './SessionHistoryList';

interface AssessmentReviewProps {
  courseId: number;
  moduleId: number;
  ctaLabel: string;
  onContinue: () => void;
}

/**
 * Test v dokončeném kurzu — jen pro čtení. Na rozdíl od AssessmentTab nikdy
 * nezakládá novou session, jen ukáže výsledky odevzdaných pokusů.
 */
export default function AssessmentReview({ courseId, moduleId, ctaLabel, onContinue }: AssessmentReviewProps) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Test</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Výsledky vašich pokusů. Kurz je dokončený, test už nejde opakovat.
        </p>
      </div>

      <SessionHistoryList courseId={courseId} moduleId={moduleId} contexts={['assessment']} />

      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <Button size="lg" onClick={onContinue}>
          {ctaLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
