'use client';

import { ArrowRight } from 'lucide-react';

interface PageFooterActionsProps {
  onBack: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueIcon?: React.ReactNode;
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
}: PageFooterActionsProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
      <button
        type="button"
        onClick={onBack}
        className="text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
      >
        {backLabel}
      </button>
      <button
        onClick={onContinue}
        className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
      >
        {continueIcon || <ArrowRight size={16} />}
        <span>{continueLabel}</span>
      </button>
    </div>
  );
}

export default PageFooterActions;
