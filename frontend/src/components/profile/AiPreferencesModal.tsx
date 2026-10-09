'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { updateProfile } from '@/lib/api-client';
import { Button, Input, Label, Modal } from '@/components/ui';

interface AiPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAiTone: string;
  initialAiExpressionLevel: string;
  onSaved: () => void;
}

export function AiPreferencesModal({
  isOpen,
  onClose,
  initialAiTone,
  initialAiExpressionLevel,
  onSaved,
}: AiPreferencesModalProps) {
  const [aiTone, setAiTone] = useState(initialAiTone);
  const [aiExpressionLevel, setAiExpressionLevel] = useState(initialAiExpressionLevel);

  useEffect(() => {
    if (isOpen) {
      setAiTone(initialAiTone);
      setAiExpressionLevel(initialAiExpressionLevel);
    }
  }, [isOpen, initialAiTone, initialAiExpressionLevel]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!aiTone.trim() || !aiExpressionLevel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(aiTone.trim(), aiExpressionLevel.trim());
      onSaved();
      onClose();
    } catch {
      setError('Nepodařilo se uložit. Zkuste to znovu.');
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
      maxWidth="max-w-md"
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={saving || !aiTone.trim() || !aiExpressionLevel.trim()}
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
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-tone">AI Tón</Label>
          <Input
            id="ai-tone"
            type="text"
            value={aiTone}
            onChange={(e) => setAiTone(e.target.value)}
            maxLength={100}
            placeholder="Profesionální a neutrální"
          />
          <p className="text-xs text-muted-foreground">Styl komunikace AI tutora</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ai-expression">AI Vyjadřování</Label>
          <Input
            id="ai-expression"
            type="text"
            value={aiExpressionLevel}
            onChange={(e) => setAiExpressionLevel(e.target.value)}
            maxLength={100}
            placeholder="Standardní srozumitelný jazyk"
          />
          <p className="text-xs text-muted-foreground">Jazyková úroveň odpovědí AI</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
