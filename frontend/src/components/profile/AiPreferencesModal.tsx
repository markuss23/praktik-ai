'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { AiStyleAxis } from '@/api';
import { getAiStyles, getMyAiStyle, updateMyAiStyle } from '@/lib/api-client';
import { readApiErrorDetail } from '@/lib/api-error';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AiPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      maxWidth="max-w-lg"
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
        <div className="flex flex-col gap-6">
          {axes.map((axis) => {
            const selected = axis.options.find((o) => o.code === choice[axis.code]);
            return (
              <fieldset key={axis.code} className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold text-foreground">{axis.name}</legend>
                {axis.options.map((option) => {
                  const checked = choice[axis.code] === option.code;
                  return (
                    <label
                      key={option.code}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all',
                        checked
                          ? 'border-gradient-r/30 bg-gradient-r/10'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <input
                        type="radio"
                        name={`ai-style-${axis.code}`}
                        value={option.code}
                        checked={checked}
                        onChange={() => setChoice((prev) => ({ ...prev, [axis.code]: option.code }))}
                        disabled={saving}
                        className="mt-0.5 size-4 shrink-0 text-gradient-r focus:ring-gradient-r/30"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{option.name}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
                {selected?.example && (
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Ukázka: </span>
                    {selected.example}
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </Modal>
  );
}
