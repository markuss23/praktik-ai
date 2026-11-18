'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { AssessmentContext } from '@/api';
import type { AssessmentFormat, CourseAssessmentConfig } from '@/lib/api-client';
import { formatName } from '@/lib/assessment-labels';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Button, Switch } from '@/components/ui';
import { cn, czechPlural } from '@/lib/utils';
import { FormatConfigCard, type FormatDraft } from './FormatConfigCard';

const ADD_LABELS: Record<AssessmentContext, string> = {
  pretest: 'Přidat do pretestu',
  practice: 'Přidat do procvičování',
  assessment: 'Přidat do testu modulu',
  course_final: 'Přidat do závěrečného testu',
};

// Šipka vlevo — přepínače vpravo nesmí být uvnitř triggeru (button v buttonu)
const TRIGGER_CLASS = 'min-w-0 flex-row-reverse justify-end items-center gap-3 px-3 sm:px-4 py-3 hover:no-underline **:data-[slot=accordion-trigger-icon]:ml-0';

interface FormatCardsProps {
  formats: AssessmentFormat[];
  context: AssessmentContext;
  // Formáty připojené v tomto kontextu (u modulu jen jeho)
  configs: CourseAssessmentConfig[];
  drafts: Record<number, FormatDraft>;
  errorsFor: (config: CourseAssessmentConfig) => string[];
  // Rozbalené karty (kódy formátů)
  open: string[];
  onOpenChange: (open: string[]) => void;
  onChange: (config: CourseAssessmentConfig, next: FormatDraft) => void;
  onRemove: (config: CourseAssessmentConfig) => void;
  // true = připojeno; přidává se jako povinný a zapnutý
  onAdd: (code: string) => Promise<boolean>;
}

// Karta pro každý formát kontextu; nepřidaný formát je prázdná karta s tlačítkem Přidat
export function FormatCards({ formats, context, configs, drafts, errorsFor, open, onOpenChange, onChange, onRemove, onAdd }: FormatCardsProps) {
  // Sdílené pro tlačítko v hlavičce i v obsahu karty
  const [addingCode, setAddingCode] = useState<string | null>(null);
  // Aktuální rozbalení i po await 
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const catalog = formats.filter((f) => f.code !== 'pretest' && f.allowedContexts.includes(context));

  const handleAdd = async (code: string) => {
    setAddingCode(code);
    try {
      const added = await onAdd(code);
      // Po přidání kartu rozbalit, ať jde rovnou nastavovat
      const current = openRef.current;
      if (added && !current.includes(code)) onOpenChange([...current, code]);
    } finally {
      setAddingCode(null);
    }
  };
  // Připojený formát mimo katalog (např. vyřazený) musí jít aspoň odebrat
  const extraCodes = configs.map((c) => c.assessmentTypeCode).filter((code) => !catalog.some((f) => f.code === code));
  const codes = [...catalog.map((f) => f.code), ...extraCodes];

  if (codes.length === 0) return <p className="text-sm text-muted-foreground">Pro tuto část nejsou k dispozici žádné formáty.</p>;

  return (
    <Accordion multiple value={open} onValueChange={(value) => onOpenChange(value as string[])} className="gap-3">
      {codes.map((code) => {
        const name = catalog.find((f) => f.code === code)?.name ?? formatName(code);
        // Stejný formát je v kontextu nejvýš jednou (unikátní index na backendu)
        const config = configs.find((c) => c.assessmentTypeCode === code);
        const draft = config ? drafts[config.courseAssessmentId] : undefined;
        const errors = config ? errorsFor(config) : [];
        const setFlags = (patch: Partial<Pick<FormatDraft, 'isRequired' | 'isEnabled'>>) => {
          if (config && draft) onChange(config, { ...draft, ...patch });
        };
        return (
          <AccordionItem
            key={code}
            value={code}
            // Nepřidaný formát = prázdný slot
            className={cn('rounded-lg border', config ? 'border-border bg-card shadow-md shadow-black/5' : 'border-dashed border-border bg-muted/40')}
          >
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <AccordionTrigger className={TRIGGER_CLASS}>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={cn('font-semibold', config ? 'text-foreground' : 'text-muted-foreground')}>{name}</span>
                    <FormatBadges attached={config !== undefined} draft={draft} code={code} hasErrors={errors.length > 0} />
                  </span>
                </AccordionTrigger>
              </div>
              {/* Přepínače jen u připojeného formátu s draftem, nepřidaný má místo nich přidat */}
              {config && draft ? (
                <div className="flex shrink-0 items-center gap-4 pb-3 pl-10 pr-3 sm:py-0 sm:pl-0 sm:pr-4">
                  <FlagSwitch label="Povinné" formatLabel={name} checked={draft.isRequired} onChange={(isRequired) => setFlags({ isRequired })} />
                  <FlagSwitch label="Zapnuté" formatLabel={name} checked={draft.isEnabled} onChange={(isEnabled) => setFlags({ isEnabled })} />
                </div>
              ) : !config && !open.includes(code) ? (
                <div className="shrink-0 pb-3 pl-10 pr-3 sm:py-0 sm:pl-0 sm:pr-4">
                  <Button variant="outline" size="sm" onClick={() => handleAdd(code)} disabled={addingCode !== null}>
                    {addingCode === code ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
                    Přidat
                    <span className="sr-only"> — {name}</span>
                  </Button>
                </div>
              ) : null}
            </div>
            <AccordionContent className="pb-0">
              <div className={cn('border-t border-border', !config && 'border-dashed')}>
                {!config ? (
                  <EmptyFormat
                    description={catalog.find((f) => f.code === code)?.description ?? null}
                    context={context}
                    adding={addingCode === code}
                    disabled={addingCode !== null}
                    onAdd={() => handleAdd(code)}
                  />
                ) : draft ? (
                  <FormatConfigCard
                    id={config.courseAssessmentId}
                    code={code}
                    value={draft}
                    onChange={(next) => onChange(config, next)}
                    onRemove={() => onRemove(config)}
                    errors={errors}
                  />
                ) : (
                  // Formát, který frontend neumí nastavit
                  <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
                    <p className="text-sm text-foreground">Nastavení tohoto formátu zde nejde upravit.</p>
                    <Button variant="ghost-destructive" size="sm" onClick={() => onRemove(config)}>Odebrat</Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function FlagSwitch({ label, formatLabel, checked, onChange }: {
  label: string;
  formatLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
      <span className="sr-only"> — {formatLabel}</span>
    </label>
  );
}

function FormatBadges({ attached, draft, code, hasErrors }: {
  attached: boolean;
  draft: FormatDraft | undefined;
  code: string;
  hasErrors: boolean;
}) {
  if (!attached) return <Badge variant="closed">Nepřidáno</Badge>;
  if (!draft) return null;
  const questionCount = code === 'closed_questions' ? (draft.settings.questions ?? []).length : null;
  return (
    <>
      {questionCount !== null && (
        <Badge variant="meta">{questionCount} {czechPlural(questionCount, 'otázka', 'otázky', 'otázek')}</Badge>
      )}
      {hasErrors && <Badge variant="danger">K doplnění</Badge>}
    </>
  );
}

function EmptyFormat({ description, context, adding, disabled, onAdd }: {
  description: string | null;
  context: AssessmentContext;
  adding: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-3 sm:p-4">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Button variant="brand-solid" onClick={onAdd} disabled={disabled}>
        {adding ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
        {ADD_LABELS[context]}
      </Button>
    </div>
  );
}
