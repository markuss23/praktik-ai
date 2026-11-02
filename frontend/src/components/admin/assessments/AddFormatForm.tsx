'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { AssessmentContext } from '@/api';
import type { AssessmentFormat } from '@/lib/api-client';
import { CONTEXT_LABELS } from '@/lib/assessment-labels';
import { Button, FilterSelect, Switch } from '@/components/ui';

interface AddFormatFormProps {
  formats: AssessmentFormat[];
  /** Kontexty, které daná úroveň nabízí (modul: practice/assessment, kurz: course_final). */
  contexts: AssessmentContext[];
  onAdd: (format: AssessmentFormat, context: AssessmentContext, isRequired: boolean) => Promise<void>;
}

/** Připojení dalšího formátu — pretest se nepřipojuje, vytváří ho generátor kurzu. */
export function AddFormatForm({ formats, contexts, onAdd }: AddFormatFormProps) {
  const available = formats.filter((f) => f.code !== 'pretest' && f.allowedContexts.some((c) => contexts.includes(c)));
  const [code, setCode] = useState('');
  const [context, setContext] = useState<AssessmentContext | ''>('');
  const [isRequired, setIsRequired] = useState(true);
  const [adding, setAdding] = useState(false);

  const format = available.find((f) => f.code === code);
  const formatContexts = format ? format.allowedContexts.filter((c) => contexts.includes(c)) : [];
  // Jediný možný kontext (např. závěrečný test) se vybere sám
  const chosenContext = formatContexts.length === 1 ? formatContexts[0] : context;

  if (available.length === 0) return null;

  const handleAdd = async () => {
    if (!format || !chosenContext) return;
    setAdding(true);
    try {
      await onAdd(format, chosenContext, isRequired);
      setCode('');
      setContext('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-dashed border-border p-3 sm:p-4">
      <p className="text-sm font-semibold text-foreground mb-3">Přidat formát</p>
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={code}
          onChange={(next) => { setCode(next); setContext(''); }}
          placeholder="Vyberte formát"
          options={available.map((f) => ({ value: f.code, label: f.name }))}
          className="min-w-56 data-[size=default]:h-auto px-3 py-2 border border-border rounded-md text-foreground text-sm bg-card"
        />
        {formatContexts.length > 1 && (
          <FilterSelect
            value={context}
            onChange={(next) => setContext(next as AssessmentContext)}
            placeholder="Kde v modulu"
            options={formatContexts.map((c) => ({ value: c, label: CONTEXT_LABELS[c] }))}
            className="min-w-44 data-[size=default]:h-auto px-3 py-2 border border-border rounded-md text-foreground text-sm bg-card"
          />
        )}
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          Povinné
        </label>
        <Button variant="brand-solid" onClick={handleAdd} disabled={!format || !chosenContext || adding}>
          {adding ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
          Přidat
        </Button>
      </div>
      {format?.description && <p className="mt-2 text-xs text-muted-foreground">{format.description}</p>}
    </div>
  );
}
