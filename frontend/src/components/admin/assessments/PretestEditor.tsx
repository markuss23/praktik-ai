'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PretestSettings } from '@/api';
import { Button, Input, Textarea } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { ClosedQuestionFields } from './ClosedQuestionFields';

interface PretestEditorProps {
  value: PretestSettings;
  onChange: (next: PretestSettings) => void;
  errors: string[];
}

/**
 * Pretest modulu — pevně 2 uzavřené a 1 otevřená otázka. Lektor mění jen
 * texty; pravidla (3 pokusy na otázku, nutno 3 ze 3) jsou dané backendem.
 */
export function PretestEditor({ value, onChange, errors }: PretestEditorProps) {
  const [keyword, setKeyword] = useState('');

  const addKeyword = () => {
    const text = keyword.trim();
    if (!text || value.open.keywords.some((k) => k.trim() === text)) return;
    onChange({ ...value, open: { ...value.open, keywords: [...value.open.keywords, text] } });
    setKeyword('');
  };

  const removeKeyword = (index: number) =>
    onChange({ ...value, open: { ...value.open, keywords: value.open.keywords.filter((_, i) => i !== index) } });

  return (
    <div className="space-y-4">
      {value.closed.map((question, index) => (
        <ClosedQuestionFields
          key={index}
          label={`Uzavřená otázka ${index + 1}`}
          value={question}
          onChange={(next) => onChange({ ...value, closed: value.closed.map((q, i) => (i === index ? next : q)) })}
        />
      ))}

      <div className="border border-border rounded-lg p-3 sm:p-4 space-y-3">
        <div>
          <label htmlFor="pretest-open-question" className="block text-sm font-semibold text-foreground mb-2">Otevřená otázka</label>
          <Input
            id="pretest-open-question"
            type="text"
            value={value.open.question}
            onChange={(e) => onChange({ ...value, open: { ...value.open, question: e.target.value } })}
            className={cn("h-auto", "w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground text-sm")}
            placeholder="Zadejte otázku..."
          />
        </div>
        <div className="ml-4">
          <label htmlFor="pretest-open-example" className="block text-xs text-muted-foreground mb-1">Vzorová odpověď</label>
          <Textarea
            id="pretest-open-example"
            value={value.open.exampleAnswer}
            onChange={(e) => onChange({ ...value, open: { ...value.open, exampleAnswer: e.target.value } })}
            className={cn("field-sizing-fixed min-h-0", "w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-gradient-r/30 text-foreground text-sm resize-none")}
            rows={2}
            placeholder="Zadejte příklad správné odpovědi..."
          />
        </div>
        <div className="ml-4">
          <label htmlFor="pretest-open-keyword" className="block text-xs text-muted-foreground mb-1">
            Klíčové body dobré odpovědi
          </label>
          {value.open.keywords.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 mb-2">
              {value.open.keywords.map((k, index) => (
                <li key={`${k}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                  {k}
                  <Button
                    variant="plain"
                    type="button"
                    onClick={() => removeKeyword(index)}
                    aria-label={`Odebrat klíčový bod ${k}`}
                    className={cn(BTN_KEEP_BOX, "text-muted-foreground hover:text-foreground")}
                  >
                    <X className="size-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              id="pretest-open-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              className={cn("h-auto", "flex-1 px-3 py-1.5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-gradient-r/30 text-foreground text-sm")}
              placeholder="Např. odeslání dat na server"
            />
            <Button variant="outline" size="sm" onClick={addKeyword} disabled={!keyword.trim()}>
              <Plus data-icon="inline-start" />
              Přidat
            </Button>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="list-disc list-inside text-sm text-destructive space-y-0.5">
          {errors.map((err) => <li key={err}>{err}</li>)}
        </ul>
      )}
    </div>
  );
}
