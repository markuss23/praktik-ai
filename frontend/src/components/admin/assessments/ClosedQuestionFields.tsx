'use client';

import { Plus, Trash2, X } from 'lucide-react';
import type { ClosedQuestionItem } from '@/api';
import { Button, Input } from '@/components/ui';
import { MAX_OPTIONS, MIN_OPTIONS } from '@/lib/assessment-validation';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

interface ClosedQuestionFieldsProps {
  label: string;
  value: ClosedQuestionItem;
  onChange: (next: ClosedQuestionItem) => void;
  /** Přidávání a odebírání možností (pretest má počet pevný). */
  editableOptionCount?: boolean;
  onRemove?: () => void;
}

/** Jedna uzavřená otázka: zadání, možnosti a označení správné. */
export function ClosedQuestionFields({ label, value, onChange, editableOptionCount = false, onRemove }: ClosedQuestionFieldsProps) {
  const setOption = (index: number, text: string) =>
    onChange({ ...value, options: value.options.map((o, i) => (i === index ? text : o)) });

  const removeOption = (index: number) => {
    const options = value.options.filter((_, i) => i !== index);
    // Správná možnost se posune s ostatními; odebraná správná → první
    const correctIndex = index === value.correctIndex ? 0 : value.correctIndex > index ? value.correctIndex - 1 : value.correctIndex;
    onChange({ ...value, options, correctIndex });
  };

  return (
    <div className="border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-foreground mb-2">{label}</label>
          <Input
            type="text"
            value={value.question}
            onChange={(e) => onChange({ ...value, question: e.target.value })}
            className={cn("h-auto", "w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground text-sm")}
            placeholder="Zadejte otázku..."
          />
        </div>
        {onRemove && (
          <Button
            variant="ghost-destructive"
            onClick={onRemove}
            aria-label={`Odebrat: ${label}`}
            className={cn(BTN_KEEP_BOX, "mt-7 p-2 rounded transition-colors shrink-0")}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      <div className="space-y-2 ml-4" role="radiogroup" aria-label={`${label} — správná odpověď`}>
        {value.options.map((option, index) => {
          const isCorrect = value.correctIndex === index;
          return (
            <div key={index} className="flex items-center gap-3">
              <Button
                variant="plain"
                type="button"
                role="radio"
                aria-checked={isCorrect}
                aria-label={isCorrect ? 'Správná odpověď' : 'Označit jako správnou odpověď'}
                title="Označit jako správnou odpověď"
                onClick={() => onChange({ ...value, correctIndex: index })}
                className={cn(BTN_KEEP_BOX, `size-4 rounded-full shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gradient-r/30 focus-visible:ring-offset-1 ${isCorrect ? 'bg-gradient-r border-2 border-gradient-r' : 'border-2 border-border hover:border-gradient-r/30'}`)}
              />
              <Input
                type="text"
                value={option}
                onChange={(e) => setOption(index, e.target.value)}
                className={cn("h-auto", "flex-1 px-3 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-gradient-r/30 text-foreground text-sm")}
                placeholder="Možnost odpovědi..."
              />
              {editableOptionCount && value.options.length > MIN_OPTIONS && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeOption(index)}
                  aria-label={`Odebrat možnost ${index + 1}`}
                >
                  <X />
                </Button>
              )}
            </div>
          );
        })}
        {editableOptionCount && value.options.length < MAX_OPTIONS && (
          <Button
            variant="plain"
            type="button"
            onClick={() => onChange({ ...value, options: [...value.options, ''] })}
            className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground ml-7")}
          >
            <Plus className="size-3.5" />
            Přidat možnost
          </Button>
        )}
      </div>
    </div>
  );
}
