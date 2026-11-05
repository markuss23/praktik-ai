'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { SessionHistoryList } from './SessionHistoryList';

interface PracticeReviewProps {
  courseId: number;
  moduleId: number;
  onContinue: () => void;
}

/** Procvičování v dokončeném kurzu — jen výsledky pretestu a procvičování, nic nespouští. */
export default function PracticeReview({ courseId, moduleId, onContinue }: PracticeReviewProps) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Procvičování</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Výsledky pretestu a procvičování. Kurz je dokončený, odpovídat už nelze.
        </p>
      </div>

      <SessionHistoryList courseId={courseId} moduleId={moduleId} contexts={['pretest', 'practice']} />

      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <Button size="lg" onClick={onContinue}>
          Pokračovat na test
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
