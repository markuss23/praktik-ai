'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { AssessmentContext } from '@/api';
import type { AssessmentFormatSettings } from '@/lib/api-client';
import { CONTEXT_LABELS, formatName } from '@/lib/assessment-labels';
import { emptyClosedQuestion, socraticTurnsToPass } from '@/lib/assessment-validation';
import { Button, Input, Label, Switch } from '@/components/ui';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import { ClosedQuestionFields } from './ClosedQuestionFields';

export interface FormatDraft {
  settings: AssessmentFormatSettings;
  isEnabled: boolean;
  isRequired: boolean;
}

interface FormatConfigCardProps {
  id: number;
  code: string;
  context: AssessmentContext;
  value: FormatDraft;
  onChange: (next: FormatDraft) => void;
  onRemove: () => void;
  errors: string[];
}

function NumberField({ id, label, value, onChange, min, max, suffix }: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="h-auto w-20 px-2 py-1.5 text-sm"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

/** Formát připojený ke kurzu (procvičování, test modulu, závěrečný test) a jeho nastavení. */
export function FormatConfigCard({ id, code, context, value, onChange, onRemove, errors }: FormatConfigCardProps) {
  const s = value.settings;
  const setSettings = (patch: Partial<AssessmentFormatSettings>) => onChange({ ...value, settings: { ...s, ...patch } });
  const questions = s.questions ?? [];
  const fieldId = (name: string) => `format-${id}-${name}`;
  const turnsToPass = socraticTurnsToPass(s);

  return (
    <div className={cn('border border-border rounded-lg', !value.isEnabled && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 sm:px-4 py-3 border-b border-border">
        <div className="grow min-w-0">
          <p className="text-sm font-semibold text-foreground">{formatName(code)}</p>
          <p className="text-xs text-muted-foreground">{CONTEXT_LABELS[context]}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <Switch checked={value.isRequired} onCheckedChange={(checked) => onChange({ ...value, isRequired: checked })} />
          Povinné
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <Switch checked={value.isEnabled} onCheckedChange={(checked) => onChange({ ...value, isEnabled: checked })} />
          Zapnuté
        </label>
        <Button
          variant="ghost-destructive"
          onClick={onRemove}
          aria-label={`Odebrat ${formatName(code)}`}
          className={cn(BTN_KEEP_BOX, "p-2 rounded transition-colors shrink-0")}
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {code === 'closed_questions' && (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <ClosedQuestionFields
                key={index}
                label={`Otázka ${index + 1}`}
                value={q}
                editableOptionCount
                onChange={(next) => setSettings({ questions: questions.map((item, i) => (i === index ? next : item)) })}
                onRemove={() => setSettings({ questions: questions.filter((_, i) => i !== index) })}
              />
            ))}
            <Button
              variant="dashed"
              onClick={() => setSettings({ questions: [...questions, emptyClosedQuestion()] })}
              className={cn(BTN_KEEP_BOX, "flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors w-full justify-center")}
            >
              <Plus size={16} />
              <span className="text-sm">Přidat otázku</span>
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {code === 'closed_questions_ai' && (
            <NumberField
              id={fieldId('count')}
              label="Počet otázek (AI)"
              value={s.questionCount}
              onChange={(v) => setSettings({ questionCount: v })}
              min={1}
              max={20}
            />
          )}
          {code === 'socratic_dialog_ai' ? (
            <>
              <NumberField id={fieldId('min-turns')} label="Nejméně kol" value={s.minTurns} onChange={(v) => setSettings({ minTurns: v })} min={1} max={10} />
              <NumberField id={fieldId('max-turns')} label="Nejvíce kol" value={s.maxTurns} onChange={(v) => setSettings({ maxTurns: v })} min={2} max={10} />
            </>
          ) : (
            <>
              <NumberField
                id={fieldId('attempts')}
                label="Pokusů na otázku"
                value={s.maxAttempts}
                onChange={(v) => setSettings({ maxAttempts: v })}
                min={1}
              />
              <NumberField
                id={fieldId('threshold')}
                label="Potřebné skóre"
                value={s.passThreshold === undefined ? undefined : Math.round(s.passThreshold * 100)}
                onChange={(v) => setSettings({ passThreshold: v === undefined ? undefined : v / 100 })}
                min={0}
                max={100}
                suffix="%"
              />
            </>
          )}
        </div>

        {code === 'socratic_dialog_ai' && turnsToPass > 1 && (
          <p className="text-xs text-muted-foreground">
            Student projde nejdřív po {turnsToPass} kolech, a to jen s výbornými odpověďmi.
            {/* Po nejmenším počtu kol smí AI rozhovor ukončit (KONEC) */}
            {s.minTurns !== undefined && s.minTurns < turnsToPass &&
              ` AI může rozhovor ukončit už po ${s.minTurns} ${czechPlural(s.minTurns, 'kole', 'kolech', 'kolech')} — pak student neprojde.`}
          </p>
        )}

        {errors.length > 0 && (
          <ul role="alert" className="list-disc list-inside text-sm text-destructive space-y-0.5">
            {errors.map((err) => <li key={err}>{err}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
