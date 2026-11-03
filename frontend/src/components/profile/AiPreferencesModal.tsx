'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { AiStyleAxis } from '@/api';
import { getAiStyles, getMyAiStyle, updateMyAiStyle } from '@/lib/api-client';
import { readApiErrorDetail } from '@/lib/api-error';
import { Button, Label, Modal, RadioGroup, RadioGroupItem } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AiPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// description je prompt pro AI; uživateli krátké shrnutí, neznámý code = jen name
const OPTION_SUMMARIES: Record<string, string> = {
  'ton.form': 'Vykání, věcně a s odstupem.',
  'ton.neut': 'Vykání, věcně a vstřícně.',
  'ton.frnd': 'Vykání, vřele a s povzbuzením.',
  'dens.low': 'Jedna myšlenka na větu.',
  'dens.med': 'Jedna až dvě myšlenky na větu.',
  'dens.high': 'Víc informací v každé větě.',
  'form.expo': 'Definice, vysvětlení, shrnutí.',
  'form.instr': 'Postup v krocích.',
  'form.narr': 'Krátký příběh z praxe.',
  'rhet.plain': 'Bez přirovnání a příkladů navíc.',
  'rhet.ex': 'Příklady z praxe.',
  'rhet.meta': 'Vysvětlení přirovnáním.',
};

/** Styl komunikace AI tutora — na každé ose (tón, hustota…) jedna volba z číselníku. */
export function AiPreferencesModal({ isOpen, onClose }: AiPreferencesModalProps) {
  const [axes, setAxes] = useState<AiStyleAxis[]>([]);
  // {kód osy: kód nastavení} — uložený stav a rozpracovaná volba
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getAiStyles(), getMyAiStyle()])
      .then(([catalog, style]) => {
        if (cancelled) return;
        setAxes(catalog);
        setSaved(style);
        setChoice(style);
      })
      .catch(() => {
        if (!cancelled) setError('Nastavení se nepodařilo načíst. Zkuste to znovu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Posílají se jen změněné osy, neuvedené zůstanou na serveru beze změny
  const changed = Object.fromEntries(
    Object.entries(choice).filter(([axis, option]) => saved[axis] !== option),
  );
  const hasChanges = Object.keys(changed).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyAiStyle(changed);
      onClose();
    } catch (err) {
      setError((await readApiErrorDetail(err)) ?? 'Nepodařilo se uložit. Zkuste to znovu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="AI Nastavení"
      description="Jak s vámi má AI tutor komunikovat."
      maxWidth="max-w-4xl"
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={saving || loading || !hasChanges}
          onClick={handleSave}
        >
          {saving ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Ukládám…
            </>
          ) : (
            'Uložit'
          )}
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Načítám nastavení" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 md:gap-3">
          {axes.map((axis) => {
            const labelId = `ai-style-${axis.code}-label`;
            return (
              // Osa vlevo, options v řadě — wide modal
              <div key={axis.code} className="grid gap-2 md:grid-cols-[9rem_1fr] md:items-center md:gap-4">
                <span id={labelId} className="text-sm font-semibold text-foreground">{axis.name}</span>
                <RadioGroup
                  aria-labelledby={labelId}
                  value={choice[axis.code] ?? null}
                  onValueChange={(value: string) => setChoice((prev) => ({ ...prev, [axis.code]: value }))}
                  disabled={saving}
                  className="sm:grid-cols-3"
                >
                  {axis.options.map((option) => {
                    const summary = OPTION_SUMMARIES[option.code];
                    return (
                      <Label
                        key={option.code}
                        className={cn(
                          'cursor-pointer items-start gap-2.5 rounded-lg border p-3 font-normal leading-normal transition-all',
                          choice[axis.code] === option.code
                            ? 'border-gradient-r/30 bg-gradient-r/10'
                            : 'border-border hover:bg-muted/50',
                        )}
                      >
                        <RadioGroupItem value={option.code} className="mt-0.5" />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">{option.name}</span>
                          {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
                        </span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
            );
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
