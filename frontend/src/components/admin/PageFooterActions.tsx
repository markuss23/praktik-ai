'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

interface PageFooterActionsProps {
  onBack: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueIcon?: React.ReactNode;
  continueDisabled?: boolean;
}

/**
 * Reusable footer component with back and continue buttons
 */
export function PageFooterActions({
  onBack,
  onContinue,
  backLabel = 'Zpět',
  continueLabel = 'Pokračovat',
  continueIcon,
  continueDisabled = false,
}: PageFooterActionsProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-t border-border bg-card">
      <Button
        variant="plain"
        type="button"
        onClick={onBack}
        className={cn(BTN_KEEP_BOX, "text-muted-foreground hover:text-foreground transition-colors text-sm font-medium px-2")}
      >
        {backLabel}
      </Button>
      <Button
        variant="plain"
        onClick={onContinue}
        disabled={continueDisabled}
        className={cn(BTN_KEEP_BOX, `flex items-center gap-2 px-3 sm:px-5 py-2 rounded-md transition-colors text-sm ${
          continueDisabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/80'
        }`)}
      >
        {continueIcon || <ArrowRight size={16} />}
        <span>{continueLabel}</span>
      </Button>
    </div>
  );
}

export default PageFooterActions;
