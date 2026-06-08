'use client';

import { useState } from 'react';
import { FileText, ListChecks, ClipboardCheck, Loader2 } from 'lucide-react';

export type CourseStep = 'content' | 'tests' | 'summary';

interface CourseStepNavProps {
  current: CourseStep;
  onNavigate: (step: CourseStep) => void | Promise<void>;
  disabled?: boolean;
}

const STEPS: { key: CourseStep; label: string; icon: typeof FileText }[] = [
  { key: 'content', label: 'Podklady', icon: FileText },
  { key: 'tests', label: 'Testy', icon: ListChecks },
  { key: 'summary', label: 'Souhrn', icon: ClipboardCheck },
];

/**
 * Krokový přepínač mezi fázemi tvorby kurzu (podklady → testy → souhrn).
 * Umožňuje pohyb mezi fázemi i jinak než tlačítky Zpět / Pokračovat.
 */
export function CourseStepNav({ current, onNavigate, disabled = false }: CourseStepNavProps) {
  const [pending, setPending] = useState<CourseStep | null>(null);

  const handleClick = async (step: CourseStep) => {
    if (pending) return;
    setPending(step);
    try {
      // onNavigate ukládá a poté přesměruje; pokud uložení selže, zůstaneme na místě
      await onNavigate(step);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 py-2 flex items-center gap-2">
        <span className="hidden sm:inline text-xs font-medium text-gray-400 mr-1">Fáze tvorby:</span>
        <nav className="flex items-center gap-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === current;
            const isPending = pending === step.key;
            return (
              <div key={step.key} className="flex items-center">
                {index > 0 && <span className="text-gray-300 mx-1">›</span>}
                <button
                  type="button"
                  onClick={() => !isActive && handleClick(step.key)}
                  disabled={disabled || isActive || pending !== null}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 cursor-default'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50'
                  }`}
                >
                  {isPending ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                  <span>{step.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default CourseStepNav;
